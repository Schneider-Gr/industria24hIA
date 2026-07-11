-- 0027: comprador não lê colunas financeiras internas nem status Asaas cru
-- do próprio pedido (bug hunt 08/07, MED). As policies de 0014 davam a linha
-- inteira: repasse_ind, repasse_afiliado, repasse_vendedor, afiliado_id,
-- transferido em linha_itens, e asaas_cobranca_id/valor_recebido_industria/
-- repasse_ind24 em pedidos ficavam visíveis ao comprador via PostgREST.
-- Mesmo padrão da 0013 (afiliado_ganhos): view com só colunas de consumo,
-- roda como owner (bypassa RLS) e filtra por auth.uid() na própria definição.

drop policy if exists pedidos_cliente_read on public.pedidos;
drop policy if exists linha_itens_cliente_read on public.linha_itens;

create or replace view public.pedidos_cliente as
  select id, id_venda, data, status_pedido, valor_pedido, forma_pagamento,
         link_cobranca, asaas_cobranca_id
  from public.pedidos
  where cliente_id = auth.uid();

create or replace view public.linha_itens_cliente as
  select li.id, li.pedido_id, li.produto_nome, li.quantidade, li.valor,
         li.valor_frete, li.retirar_na_loja, li.entrega_rua, li.entrega_numero,
         li.entrega_bairro, li.entrega_cidade, li.entrega_cep
  from public.linha_itens li
  join public.pedidos pe on pe.id = li.pedido_id
  where pe.cliente_id = auth.uid();

grant select on public.pedidos_cliente to authenticated;
grant select on public.linha_itens_cliente to authenticated;
