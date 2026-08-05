-- 0105: expõe o timestamp de confirmação de entrega (PRD 009 US01) na view
-- do cliente. A fonte real é `entregas.atualizado_em` quando status =
-- 'Entregue' (não existe timestamp em linha_itens.entregue, só o boolean).
-- Só recria a view (create or replace), não altera tabela com dado real.

create or replace view public.linha_itens_cliente as
  select li.id, li.pedido_id, li.produto_nome, li.quantidade, li.valor, li.valor_frete,
         li.retirar_na_loja, li.entrega_rua, li.entrega_numero, li.entrega_bairro,
         li.entrega_cidade, li.entrega_cep, li.produto_id,
         li.entregue,
         en.atualizado_em as entregue_em,
         p.perecivel
  from public.linha_itens li
  join public.pedidos pe on pe.id = li.pedido_id
  left join public.entregas en on en.linha_item_id = li.id and en.status = 'Entregue'
  left join public.produtos p on p.id = li.produto_id
  where pe.cliente_id = auth.uid();

grant select on public.linha_itens_cliente to authenticated;
