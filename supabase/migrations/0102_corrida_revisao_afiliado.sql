-- 0102: produto pode ser marcado como habilitado para parceiro logístico.
-- Quando um pedido pago tiver ao menos um item assim marcado E a loja tiver
-- afiliado logístico Aprovado, a corrida do despacho automático (0043/0074/
-- 0079) nasce marcada como "requer revisão": o afiliado exclusivo precisa
-- conferir/editar peso, volume, janela e descrição antes de poder aceitar.
-- Sem produto marcado, ou sem afiliado exclusivo, comportamento é idêntico
-- ao de hoje.
--
-- Decisão fechada com o dono (15/07/2026), retomada em 31/07 sobre a base
-- atual (a branch original ficou 158 commits atrás de master e com o número
-- 0051 colidido por outra migration já mergeada): reaproveita a MESMA janela
-- de exclusividade de 5 min já existente (0043) — nada de status novo nem
-- cron. Se o afiliado não revisar a tempo, a corrida cai no pool geral
-- exatamente como já cai hoje quando ele simplesmente não aceita.
--
-- Não substitui `permite_logistica_afiliado` (0079, 24/07) — aquele flag
-- decide QUEM ganha exclusividade (afiliado x pool geral); este decide se a
-- corrida nasce pedindo revisão antes de poder ser aceita. São ortogonais.

alter table public.produtos
  add column if not exists parceiro_logistico_habilitado boolean not null default false;

alter table public.corridas
  add column if not exists requer_revisao_afiliado boolean not null default false;

-- ============ despachar_corrida_automatica: marca requer_revisao_afiliado ============
-- Base: versão 0079 (skip consolidado, frete = soma das linhas, janela 4h da
-- 0048, exclusividade filtrada por permite_logistica_afiliado). Única
-- mudança: calcula se algum item do pedido está com
-- parceiro_logistico_habilitado e, se sim (e houver afiliado exclusivo),
-- marca a corrida como requer_revisao_afiliado.
create or replace function public.despachar_corrida_automatica(p_pedido_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_ja_existe uuid;
  v_pedido record;
  v_item record;
  v_frete_total numeric(12,2);
  v_loja record;
  v_afiliado uuid;
  v_requer_revisao boolean;
  v_id uuid;
begin
  select id into v_ja_existe from corridas where pedido_id = p_pedido_id;
  if v_ja_existe is not null then
    return v_ja_existe; -- idempotente
  end if;

  select id, loja_id, frete_consolidado into v_pedido from pedidos where id = p_pedido_id;
  if not found then raise exception 'Pedido não encontrado.'; end if;

  -- 0074: consolidado espera o lote do admin (webhook trata null como "sem corrida")
  if v_pedido.frete_consolidado then
    return null;
  end if;

  select entrega_cep, entrega_rua, entrega_numero, entrega_bairro,
         entrega_cidade, entrega_complemento
    into v_item
  from linha_itens
  where pedido_id = p_pedido_id and retirar_na_loja = false and entrega_cep is not null
  limit 1;
  if not found then
    return null; -- retirada na loja: sem corrida
  end if;

  -- frete total do pedido (todas as linhas de entrega), não o de uma linha só
  select coalesce(sum(valor_frete), 0) into v_frete_total
  from linha_itens
  where pedido_id = p_pedido_id and retirar_na_loja = false;

  select cep, rua, numero, cidade, estado into v_loja
  from lojas where id = v_pedido.loja_id;

  -- afiliado exclusivo só se nenhum item com entrega estiver desabilitado
  select afiliado_id into v_afiliado
  from afiliacoes
  where loja_id = v_pedido.loja_id and tipo = 'logistica' and status = 'Aprovada'
    and not exists (
      select 1 from linha_itens li
      join produtos pr on pr.id = li.produto_id
      where li.pedido_id = p_pedido_id and li.retirar_na_loja = false
        and pr.permite_logistica_afiliado = false)
  order by created_at asc
  limit 1;

  -- algum item do pedido pede revisão do afiliado antes do despacho?
  select exists (
    select 1 from linha_itens li
    join produtos pr on pr.id = li.produto_id
    where li.pedido_id = p_pedido_id and li.retirar_na_loja = false
      and pr.parceiro_logistico_habilitado
  ) into v_requer_revisao;

  insert into corridas (
    solicitante_id, pedido_id,
    origem_cep, origem_endereco,
    destino_cep, destino_endereco,
    peso_kg, modo, preco_sugerido, preco_final,
    janela_inicio, janela_fim,
    afiliado_exclusivo_id, exclusividade_fim,
    requer_revisao_afiliado
  )
  select
    pe.cliente_id, p_pedido_id,
    coalesce(v_loja.cep, ''), concat_ws(', ', v_loja.rua, v_loja.numero, v_loja.cidade, v_loja.estado, v_loja.cep),
    v_item.entrega_cep, concat_ws(', ', v_item.entrega_rua, v_item.entrega_numero, v_item.entrega_bairro, v_item.entrega_cidade, v_item.entrega_complemento),
    1, -- peso_kg placeholder: produtos não têm peso confiável hoje (só 89/358, ver rebuild); NOT NULL exige > 0
    'primeiro_aceita',
    v_frete_total, v_frete_total,
    now(), now() + interval '4 hours', -- janela da 0048 (4h pro parceiro coletar)
    v_afiliado, case when v_afiliado is not null then now() + interval '5 minutes' else null end,
    (v_requer_revisao and v_afiliado is not null)
  from pedidos pe where pe.id = p_pedido_id
  returning id into v_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (null, 'sistema', 'corrida.despacho_automatico', 'corridas', v_id,
          jsonb_build_object('pedido_id', p_pedido_id, 'afiliado_exclusivo_id', v_afiliado,
                              'requer_revisao_afiliado', v_requer_revisao and v_afiliado is not null));

  return v_id;
end; $$;
revoke all on function public.despachar_corrida_automatica(uuid) from public, anon;
grant execute on function public.despachar_corrida_automatica(uuid) to authenticated, service_role;

-- ============ revisar_corrida_afiliado: afiliado exclusivo edita e sai do estado "requer revisão" ============
create or replace function public.revisar_corrida_afiliado(
  p_corrida_id uuid,
  p_peso_kg numeric,
  p_volume_m3 numeric,
  p_janela_inicio timestamptz,
  p_janela_fim timestamptz,
  p_descricao_carga text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_c record;
begin
  select * into v_c from corridas where id = p_corrida_id for update;
  if not found then raise exception 'Corrida não encontrada.'; end if;
  if v_c.afiliado_exclusivo_id <> auth.uid() then
    raise exception 'Apenas o afiliado exclusivo desta corrida pode revisá-la.';
  end if;
  if not v_c.requer_revisao_afiliado then
    raise exception 'Esta corrida não está pendente de revisão.';
  end if;
  if v_c.exclusividade_fim < now() then
    raise exception 'Janela de exclusividade expirada — a corrida já caiu no pool geral.';
  end if;
  if p_peso_kg <= 0 then raise exception 'Peso precisa ser maior que zero.'; end if;
  if p_janela_fim <= p_janela_inicio then raise exception 'Fim da janela precisa ser depois do início.'; end if;

  update corridas set
    peso_kg = p_peso_kg,
    volume_m3 = p_volume_m3,
    janela_inicio = p_janela_inicio,
    janela_fim = p_janela_fim,
    descricao_carga = p_descricao_carga,
    requer_revisao_afiliado = false
  where id = p_corrida_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (auth.uid(), 'afiliado', 'corrida.revisada', 'corridas', p_corrida_id,
          jsonb_build_object('peso_kg', p_peso_kg, 'janela_inicio', p_janela_inicio, 'janela_fim', p_janela_fim));
end; $$;
revoke all on function public.revisar_corrida_afiliado(uuid, numeric, numeric, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.revisar_corrida_afiliado(uuid, numeric, numeric, timestamptz, timestamptz, text) to authenticated;

-- ============ aceitar_corrida: bloqueia enquanto pendente de revisão ============
-- Base: versão 0043 (única em master). Única mudança: novo guard logo após
-- checar status/modo, antes do guard de exclusividade.
create or replace function public.aceitar_corrida(p_corrida_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_p uuid;              -- id em parceiros_logisticos, se houver
  v_afiliado boolean := false;
  v_c record;
begin
  select id into v_p from parceiros_logisticos where user_id = auth.uid() and status = 'Aprovado';

  select * into v_c from corridas where id = p_corrida_id for update;
  if not found then raise exception 'Corrida não encontrada.'; end if;
  if v_c.status <> 'Publicada' then raise exception 'Corrida não está mais disponível.'; end if;
  if v_c.modo <> 'primeiro_aceita' then raise exception 'Esta corrida é por leilão: dê um lance.'; end if;
  if v_c.requer_revisao_afiliado and v_c.afiliado_exclusivo_id = auth.uid() then
    raise exception 'Revise peso, janela e descrição antes de aceitar esta corrida.';
  end if;

  -- janela de exclusividade: só o afiliado_exclusivo_id aceita antes do prazo
  if v_c.afiliado_exclusivo_id is not null and v_c.exclusividade_fim > now()
     and v_c.afiliado_exclusivo_id <> auth.uid() then
    raise exception 'Corrida em janela de exclusividade de outro afiliado.';
  end if;

  if v_c.afiliado_exclusivo_id = auth.uid() then
    v_afiliado := true;
  elsif v_p is null then
    raise exception 'Apenas parceiro logístico aprovado ou afiliado logístico aceita corridas.';
  end if;

  update corridas set status = 'Aceita',
    parceiro_id = v_p,
    afiliado_exclusivo_id = case when v_afiliado then auth.uid() else null end
  where id = p_corrida_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (auth.uid(), case when v_afiliado then 'afiliado' else 'parceiro' end,
          'corrida.aceita', 'corridas', p_corrida_id,
          jsonb_build_object('parceiro_id', v_p, 'afiliado_exclusivo', v_afiliado));
end; $$;
grant execute on function public.aceitar_corrida(uuid) to authenticated;
