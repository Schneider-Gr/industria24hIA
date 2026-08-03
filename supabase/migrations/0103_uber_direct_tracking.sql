-- 0103: colunas de rastreamento Uber Direct na tabela rotas (PRD 008).
-- Reusa `rotas` em vez de tabela nova: mesma entidade (uma entrega por
-- pedido), só troca quem executa (parceiro/afiliado interno vs Uber Direct).
-- parceiro_id e afiliado_id continuam null quando a via é Uber Direct.
-- if not exists: já aplicada manualmente via db query antes do merge que
-- revelou colisão com 0098_seller_carrinhos_abandonados (renumerada
-- 0098 -> 0099 -> 0103 por DUAS colisões sucessivas com PRs concorrentes —
-- ver Registro de Decisões no PRD 008) — idempotente p/ não quebrar db push.
alter table public.rotas
  add column if not exists uber_delivery_id  text,
  add column if not exists uber_tracking_url text,
  add column if not exists uber_status       text;

comment on column public.rotas.uber_delivery_id is
  'ID da delivery na Uber Direct. Presente só quando a rota foi despachada via fallback Uber Direct (PRD 008), não via parceiro/afiliado interno.';
