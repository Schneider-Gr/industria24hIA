-- 0173: view `produtos_vendaveis` — fonte única do que pode aparecer na vitrine.
--
-- Até aqui, TODA listagem pública filtrava só `status_produto = 'Aprovado'`.
-- Em 16/09/2026, 50 dos 115 produtos aprovados estavam com `estoque_atual = 0`
-- e continuavam na vitrine: o comprador só descobria a ruptura na tela de
-- pagamento, quando `checkout_criar_pedido` levantava "Estoque insuficiente".
--
-- Mas esconder "todo produto sem estoque" seria pior: 46 desses 50 têm oferta
-- de venda futura com saldo, ou seja, são vendáveis por reserva. A regra certa
-- é saldo à vista OU reserva ativa — e mora aqui, uma vez, em vez de repetida
-- em 12 consultas (e esquecida na décima terceira).
--
-- Só listagem pública lê desta view. Checkout, pedidos, disputas, painel do
-- seller e painel do admin continuam lendo `produtos`, porque precisam enxergar
-- justamente o produto em ruptura.
--
-- security_barrier pelo mesmo motivo de 0124: sem ele o planner pode empurrar
-- uma função do consumidor para antes do filtro da view.
create or replace view public.produtos_vendaveis as
  select p.*
  from public.produtos p
  join public.lojas l on l.id = p.loja_id
  where p.status_produto = 'Aprovado'
    and l.situacao = 'Ativa'
    and p.valor > 0
    and (
      coalesce(p.estoque_atual, 0) > 0
      or exists (
        select 1 from public.vendas_futuras vf
        where vf.produto_id = p.id and vf.estoque > 0
      )
    );

alter view public.produtos_vendaveis set (security_barrier = true);

grant select on public.produtos_vendaveis to anon, authenticated;

comment on view public.produtos_vendaveis is
  'Produtos exibíveis na vitrine: aprovados, de loja ativa, com preço e com saldo à vista ou venda futura ativa. Listagem pública lê daqui; checkout e painéis leem `produtos`.';

-- Complemento negativo da mesma regra. As listagens públicas precisam manter
-- `from("produtos")` para não perder o embed `produto_imagens(...)` (PostgREST
-- não expõe a relação reversa a partir de uma view), então elas aplicam
-- `not in (produtos_em_ruptura)`. A regra continua definida uma única vez,
-- acima.
create or replace view public.produtos_em_ruptura as
  select p.id, p.loja_id
  from public.produtos p
  where p.status_produto = 'Aprovado'
    and not exists (select 1 from public.produtos_vendaveis v where v.id = p.id);

alter view public.produtos_em_ruptura set (security_barrier = true);

grant select on public.produtos_em_ruptura to anon, authenticated;

comment on view public.produtos_em_ruptura is
  'Produtos aprovados que não podem ser vendidos agora (sem saldo e sem venda futura ativa). Usada pelas listagens públicas para excluí-los da vitrine.';

-- Índice para o `exists` da view: a varredura por produto com reserva ativa é
-- feita a cada listagem.
create index if not exists idx_vendas_futuras_produto_estoque
  on public.vendas_futuras (produto_id)
  where estoque > 0;
