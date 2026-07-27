-- 0079: afiliado logístico por produto + percurso na corrida.
--
-- Dois buracos do módulo de afiliado logístico, fechados com o dono (24/07/2026):
--
-- (1) O seller não conseguia escolher QUAIS produtos o afiliado logístico da
--     loja pode entregar — a afiliação de logística é por LOJA (afiliacoes.
--     tipo='logistica') e valia pra loja inteira. Novo flag por produto:
--     `permite_logistica_afiliado`. Default TRUE de propósito: hoje o afiliado
--     atende tudo; um default FALSE desligaria a exclusividade de todos os
--     pedidos vivos em produção de uma vez. O seller desmarca o que não quer.
--
-- (2) A corrida não guardava distância/percurso — só `rotas` (fluxo manual
--     antigo, 0039) tinha distancia_m/link_mapa. O despacho automático (0043)
--     nasce sem nada disso, então o afiliado só via "origem → destino" em
--     texto. Colunas novas em `corridas`, preenchidas pelo webhook via
--     Distance Matrix (src/lib/maps.ts) no momento do despacho.

-- ============ 1. Flag por produto ============
alter table public.produtos
  add column if not exists permite_logistica_afiliado boolean not null default true;

-- ============ 2. Percurso na corrida ============
alter table public.corridas
  add column if not exists distancia_m int,
  add column if not exists duracao_s   int,
  add column if not exists link_mapa   text;

-- ============ 3. Despacho respeita o flag do produto ============
-- Base: versão 0074 (skip consolidado, frete = soma das linhas, janela 4h da
-- 0048). Única mudança: o afiliado logístico só ganha exclusividade se TODOS
-- os itens com entrega do pedido estiverem habilitados. Se um item
-- desabilitado entrar no pedido, a corrida nasce direto pro pool geral de
-- parceiros de plataforma (afiliado_exclusivo_id = null).
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

  insert into corridas (
    solicitante_id, pedido_id,
    origem_cep, origem_endereco,
    destino_cep, destino_endereco,
    peso_kg, modo, preco_sugerido, preco_final,
    janela_inicio, janela_fim,
    afiliado_exclusivo_id, exclusividade_fim
  )
  select
    pe.cliente_id, p_pedido_id,
    coalesce(v_loja.cep, ''), concat_ws(', ', v_loja.rua, v_loja.numero, v_loja.cidade, v_loja.estado, v_loja.cep),
    v_item.entrega_cep, concat_ws(', ', v_item.entrega_rua, v_item.entrega_numero, v_item.entrega_bairro, v_item.entrega_cidade, v_item.entrega_complemento),
    1, -- peso_kg placeholder: produtos não têm peso confiável hoje (só 89/358, ver rebuild); NOT NULL exige > 0
    'primeiro_aceita',
    v_frete_total, v_frete_total,
    now(), now() + interval '4 hours', -- janela da 0048 (4h pro parceiro coletar)
    v_afiliado, case when v_afiliado is not null then now() + interval '5 minutes' else null end
  from pedidos pe where pe.id = p_pedido_id
  returning id into v_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (null, 'sistema', 'corrida.despacho_automatico', 'corridas', v_id,
          jsonb_build_object('pedido_id', p_pedido_id, 'afiliado_exclusivo_id', v_afiliado));

  return v_id;
end; $$;
revoke all on function public.despachar_corrida_automatica(uuid) from public, anon;
grant execute on function public.despachar_corrida_automatica(uuid) to authenticated, service_role;
