-- 0098: colunas de rastreamento Uber Direct na tabela rotas (PRD 008).
-- Reusa `rotas` em vez de tabela nova: mesma entidade (uma entrega por
-- pedido), só troca quem executa (parceiro/afiliado interno vs Uber Direct).
-- parceiro_id e afiliado_id continuam null quando a via é Uber Direct.
alter table public.rotas
  add column uber_delivery_id  text,
  add column uber_tracking_url text,
  add column uber_status       text;

comment on column public.rotas.uber_delivery_id is
  'ID da delivery na Uber Direct. Presente só quando a rota foi despachada via fallback Uber Direct (PRD 008), não via parceiro/afiliado interno.';
