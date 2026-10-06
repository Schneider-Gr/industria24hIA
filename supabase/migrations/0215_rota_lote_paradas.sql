-- 0215: rota com várias entregas (PRD 060, Milestone 1: US01 e US02).
--
-- A consolidação de carga (0074) já monta o lote e a corrida única. Aqui:
-- 1. lote_pedidos ganha a parada: ordem, previsão de chegada (segundos depois
--    da coleta) e o endereço de entrega daquele pedido. Não há tabela nova:
--    uma linha de lote_pedidos já é uma parada.
-- 2. criar_lote_consolidacao (base: produção em 06/10/2026): aceita o lote
--    quando todos os destinos estão na zona declarada de um mesmo entregador
--    (0214); sem isso continua valendo o corredor de 3 dígitos. Máximo de 25
--    entregas, o limite de paradas da otimização de rota.
-- 3. lote_definir_rota: o admin grava a ordem otimizada e as previsões. Se a
--    rota não puder ser calculada, o lote fica na ordem de chegada dos pedidos
--    (rota_otimizada = false) e nada trava.
-- 4. lote_atualizar_manifesto: o destino da corrida vira a lista numerada das
--    paradas, que é o que as telas do entregador já mostram.
-- Código por parada e "faltam N entregas" (US03 e US04) ficam para o Milestone 2.

alter table public.lote_pedidos
  add column if not exists ordem integer,
  add column if not exists chegada_s integer check (chegada_s is null or chegada_s >= 0),
  add column if not exists endereco text;

alter table public.lotes_consolidacao
  add column if not exists rota_otimizada boolean not null default false;

comment on column public.lote_pedidos.ordem is 'Posição da parada na rota do lote (0215, PRD 060). 1 = primeira entrega.';
comment on column public.lote_pedidos.chegada_s is 'Previsão: segundos entre a coleta na loja e a chegada nesta parada (0215).';

-- Lotes anteriores à 0215: ordem de chegada dos pedidos.
update public.lote_pedidos lp
set ordem = s.n,
    endereco = coalesce(lp.endereco, s.endereco)
from (
  select lp2.lote_id, lp2.pedido_id,
         row_number() over (partition by lp2.lote_id order by pe.created_at, pe.id) as n,
         (select concat_ws(', ', li.entrega_rua, li.entrega_numero, li.entrega_bairro, li.entrega_cidade, li.entrega_cep)
          from linha_itens li
          where li.pedido_id = pe.id and li.retirar_na_loja = false and li.entrega_cep is not null
          limit 1) as endereco
  from public.lote_pedidos lp2 join public.pedidos pe on pe.id = lp2.pedido_id
) s
where s.lote_id = lp.lote_id and s.pedido_id = lp.pedido_id and lp.ordem is null;

create or replace function public.lote_atualizar_manifesto(p_lote_id uuid)
returns void
language sql
security definer
set search_path to 'public'
as $$
  update corridas c
  set destino_endereco = m.texto
  from (
    select l.corrida_id,
           string_agg(
             lp.ordem || '. ' || coalesce(lp.endereco, 'endereço não informado')
               || case when lp.chegada_s is not null
                       then ' (+' || greatest(1, round(lp.chegada_s / 60.0))::int || ' min da coleta)' else '' end,
             ' | ' order by lp.ordem) as texto
    from lotes_consolidacao l join lote_pedidos lp on lp.lote_id = l.id
    where l.id = p_lote_id
    group by l.corrida_id
  ) m
  where c.id = m.corrida_id and m.texto is not null;
$$;

create or replace function public.lote_definir_rota(
  p_lote_id uuid,
  p_pedido_ids uuid[],
  p_chegadas_s integer[],
  p_distancia_m integer,
  p_duracao_s integer,
  p_link_mapa text
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_corrida uuid;
  v_status text;
  v_n integer;
begin
  if not public.is_admin() then
    raise exception 'Apenas admin define a rota do lote.';
  end if;
  select l.corrida_id, c.status into v_corrida, v_status
  from lotes_consolidacao l left join corridas c on c.id = l.corrida_id
  where l.id = p_lote_id and l.status = 'Publicado'
  for update of l;
  if not found then
    raise exception 'Lote não encontrado ou já encerrado.';
  end if;
  if v_status is not null and v_status not in ('Publicada', 'Aceita') then
    raise exception 'A rota não muda depois da coleta.';
  end if;

  select count(*) into v_n from lote_pedidos where lote_id = p_lote_id;
  if coalesce(array_length(p_pedido_ids, 1), 0) <> v_n
     or coalesce(array_length(p_chegadas_s, 1), 0) <> v_n
     or (select count(distinct x) from unnest(p_pedido_ids) x) <> v_n
     or exists (select 1 from unnest(p_pedido_ids) x
                where not exists (select 1 from lote_pedidos lp where lp.lote_id = p_lote_id and lp.pedido_id = x)) then
    raise exception 'A rota precisa ter exatamente as paradas do lote.';
  end if;

  update lote_pedidos lp
  set ordem = r.n, chegada_s = r.chegada
  from (select x as pedido_id, n::int as n, p_chegadas_s[n] as chegada
        from unnest(p_pedido_ids) with ordinality t(x, n)) r
  where lp.lote_id = p_lote_id and lp.pedido_id = r.pedido_id;

  update lotes_consolidacao set rota_otimizada = true where id = p_lote_id;

  update corridas
  set distancia_m = p_distancia_m, duracao_s = p_duracao_s, link_mapa = p_link_mapa
  where id = v_corrida;

  perform public.lote_atualizar_manifesto(p_lote_id);

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (auth.uid(), 'admin', 'lote.rota_definida', 'lotes_consolidacao', p_lote_id,
          jsonb_build_object('ordem', p_pedido_ids, 'chegadas_s', p_chegadas_s,
                             'distancia_m', p_distancia_m, 'duracao_s', p_duracao_s));
end;
$$;

revoke all on function public.lote_atualizar_manifesto(uuid) from public, anon, authenticated;
revoke all on function public.lote_definir_rota(uuid, uuid[], integer[], integer, integer, text) from public, anon;
grant execute on function public.lote_definir_rota(uuid, uuid[], integer[], integer, integer, text) to authenticated;

-- ---------------------------------------------------------------- montar lote
-- Base: definição de produção em 06/10/2026. Mudanças marcadas com "0215".
CREATE OR REPLACE FUNCTION public.criar_lote_consolidacao(p_pedido_ids uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_loja_id uuid;
  v_corredor text;
  v_loja record;
  v_afiliado uuid;
  v_frete_total numeric(12,2) := 0;
  v_qtd int;
  v_corrida uuid;
  v_lote uuid;
  v_destinos text;
begin
  if not public.is_admin() then
    raise exception 'Apenas admin monta lotes de consolidação.';
  end if;
  if p_pedido_ids is null or array_length(p_pedido_ids, 1) < 2 then
    raise exception 'Um lote precisa de pelo menos 2 pedidos.';
  end if;

  -- 0215 (PRD 060): limite de paradas da otimização de rota (Routes API).
  if array_length(p_pedido_ids, 1) > 25 then
    raise exception 'Um lote aceita no máximo 25 entregas. Divida em lotes menores.';
  end if;

  -- valida o conjunto: pagos, consolidados, mesma loja, sem corrida/lote
  select count(*), min(pe.loja_id::text)::uuid
    into v_qtd, v_loja_id
  from pedidos pe
  where pe.id = any (p_pedido_ids)
    and pe.status_pedido = 'Pagamento Realizado'
    and pe.frete_consolidado
    and not exists (select 1 from corridas c where c.pedido_id = pe.id)
    and not exists (select 1 from lote_pedidos lp where lp.pedido_id = pe.id);
  if v_qtd <> array_length(p_pedido_ids, 1) then
    raise exception 'Todos os pedidos devem estar pagos, marcados como frete consolidado e fora de outro lote/corrida.';
  end if;
  if exists (select 1 from pedidos where id = any (p_pedido_ids) and loja_id <> v_loja_id) then
    raise exception 'V1: todos os pedidos do lote devem ser da mesma loja (uma coleta).';
  end if;

  -- 0215 (PRD 060, decisão 3): o lote vale se todos os destinos estão na zona
  -- declarada de um mesmo entregador da loja (PRD 059); sem isso, continua
  -- valendo o corredor de 3 dígitos do CEP (0074).
  select left(min(li.entrega_cep), 3) into v_corredor
  from linha_itens li
  where li.pedido_id = any (p_pedido_ids) and li.entrega_cep is not null;

  select a.afiliado_id into v_afiliado
  from afiliacoes a
  where a.loja_id = v_loja_id and a.tipo = 'logistica' and a.status = 'Aprovada'
    and exists (select 1 from entregador_zonas z where z.user_id = a.afiliado_id)
    and not exists (
      select 1 from linha_itens li
      where li.pedido_id = any (p_pedido_ids) and li.retirar_na_loja = false and li.entrega_cep is not null
        and not public.entregador_atende(a.afiliado_id, li.entrega_cep, li.entrega_bairro))
  order by a.created_at asc
  limit 1;

  if v_afiliado is null then
    if exists (
      select 1 from linha_itens li
      where li.pedido_id = any (p_pedido_ids) and li.entrega_cep is not null
        and left(li.entrega_cep, 3) <> v_corredor
    ) then
      raise exception 'Os destinos não estão na zona de um mesmo entregador nem no mesmo corredor (prefixo % do CEP).', v_corredor;
    end if;
    -- sem zona declarada que cubra: entregador que atende tudo, como na 0074
    select a.afiliado_id into v_afiliado
    from afiliacoes a
    where a.loja_id = v_loja_id and a.tipo = 'logistica' and a.status = 'Aprovada'
      and not exists (select 1 from entregador_zonas z where z.user_id = a.afiliado_id)
    order by a.created_at asc
    limit 1;
  end if;

  select sum(coalesce(li.valor_frete, 0)),
         string_agg(concat_ws(', ', li.entrega_rua, li.entrega_numero, li.entrega_bairro, li.entrega_cidade, li.entrega_cep), ' | ')
    into v_frete_total, v_destinos
  from linha_itens li
  where li.pedido_id = any (p_pedido_ids)
    and li.retirar_na_loja = false and li.entrega_cep is not null;
  if coalesce(v_frete_total, 0) <= 0 then
    raise exception 'Lote sem frete a pagar — pedidos são de retirada na loja?';
  end if;

  select cep, rua, numero, cidade, estado into v_loja from lojas where id = v_loja_id;

  -- corrida única (manifesto): preco = soma dos fretes consolidados cobrados
  insert into corridas (
    solicitante_id, origem_cep, origem_endereco,
    destino_cep, destino_endereco, descricao_carga,
    peso_kg, modo, preco_sugerido, preco_final,
    janela_inicio, janela_fim,
    afiliado_exclusivo_id, exclusividade_fim
  ) values (
    auth.uid(), coalesce(v_loja.cep, ''),
    concat_ws(', ', v_loja.rua, v_loja.numero, v_loja.cidade, v_loja.estado, v_loja.cep),
    v_corredor || '00000',
    v_destinos,
    format('Lote consolidado: %s entregas no corredor %sxx-xxx', v_qtd, v_corredor),
    v_qtd, -- ponytail: peso placeholder 1/pedido, igual à 0043; peso real quando o cadastro tiver
    'primeiro_aceita', v_frete_total, v_frete_total,
    now(), now() + interval '24 hours',
    v_afiliado, case when v_afiliado is not null then now() + interval '5 minutes' else null end
  ) returning id into v_corrida;

  insert into lotes_consolidacao (loja_id, corredor_cep, corrida_id, criado_por)
  values (v_loja_id, v_corredor, v_corrida, auth.uid())
  returning id into v_lote;

  -- 0215: cada pedido é uma parada. Nasce na ordem de chegada dos pedidos; a
  -- lote_definir_rota troca pela ordem otimizada quando a rota é calculada.
  insert into lote_pedidos (lote_id, pedido_id, frete_rateado, ordem, endereco)
  select v_lote, pe.id,
         (select coalesce(sum(li.valor_frete), 0) from linha_itens li where li.pedido_id = pe.id),
         row_number() over (order by pe.created_at, pe.id),
         (select concat_ws(', ', li.entrega_rua, li.entrega_numero, li.entrega_bairro, li.entrega_cidade, li.entrega_cep)
          from linha_itens li
          where li.pedido_id = pe.id and li.retirar_na_loja = false and li.entrega_cep is not null
          limit 1)
  from pedidos pe where pe.id = any (p_pedido_ids);

  perform public.lote_atualizar_manifesto(v_lote);

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (auth.uid(), 'admin', 'lote.criado', 'lotes_consolidacao', v_lote,
          jsonb_build_object('pedidos', p_pedido_ids, 'corrida_id', v_corrida,
                             'frete_total', v_frete_total, 'corredor', v_corredor));

  return v_lote;
end; $function$;
