-- 0118: devolução parcial em venda futura mediante avaliação de fotos.
-- Reaproveita a infraestrutura de disputas (0104/0115) — só expõe
-- venda_futura_id na view do cliente para a regra de negócio (foto
-- obrigatória + desfecho restrito a reembolso_parcial/negada) poder
-- identificar o item. Sem tabela nova.

create or replace view public.linha_itens_cliente as
  select li.id, li.pedido_id, li.produto_nome, li.quantidade, li.valor, li.valor_frete,
         li.retirar_na_loja, li.entrega_rua, li.entrega_numero, li.entrega_bairro,
         li.entrega_cidade, li.entrega_cep, li.produto_id,
         li.entregue,
         en.atualizado_em as entregue_em,
         p.perecivel,
         li.venda_futura_id
  from public.linha_itens li
  join public.pedidos pe on pe.id = li.pedido_id
  left join public.entregas en on en.linha_item_id = li.id and en.status = 'Entregue'
  left join public.produtos p on p.id = li.produto_id
  where pe.cliente_id = auth.uid();

grant select on public.linha_itens_cliente to authenticated;
