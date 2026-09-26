-- 0198: estoque crítico separado do mínimo por pedido.
--
-- `quantidade_minima` é o mínimo por pedido: o carrinho e o checkout recusam
-- menos que isso (0014 em diante, até 0189). O painel e os alertas de estoque
-- (PRD 047, estadoEstoque) reaproveitavam o mesmo número como limite de
-- "estoque crítico". Subir o mínimo por pedido de 5 para 12, como o simulador
-- de frete vai sugerir (PRD 054), marcava o produto como crítico e disparava
-- alerta sem nada de errado com o estoque. Decisão da dona, 25/09/2026.
--
-- Backfill com o valor atual para nada mudar hoje; daqui em diante os dois
-- campos se separam. NULL = padrão de 5 (ESTOQUE_CRITICO_PADRAO).

alter table public.produtos
  add column if not exists estoque_critico integer check (estoque_critico >= 0);

update public.produtos
   set estoque_critico = quantidade_minima
 where estoque_critico is null and quantidade_minima is not null;
