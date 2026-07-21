-- A view `afiliado_ganhos` não expõe data nem número do pedido, então o
-- painel do afiliado não tinha como conciliar as vendas com o extrato: a
-- tabela listava produto e valor sem dizer QUANDO nem de QUAL pedido.
--
-- Mantém o filtro por auth.uid() na definição (é o que isola cada afiliado) e
-- acrescenta a data e o id_venda vindos de `pedidos`.

-- DROP + CREATE: `create or replace view` não permite inserir colunas no meio
-- da lista existente (42P16).
drop view if exists public.afiliado_ganhos;

create view public.afiliado_ganhos as
  select li.id,
         li.pedido_id,
         li.produto_id,
         li.produto_nome,
         li.quantidade,
         li.valor,
         li.repasse_afiliado,
         li.pago,
         li.afiliado_id,
         p.id_venda,
         p.data as pedido_data
  from linha_itens li
  join pedidos p on p.id = li.pedido_id
  where li.afiliado_id = auth.uid();
