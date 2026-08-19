-- PRD 019 (docs/prds/019-indices-fk-triagem-e-gatilhos-escala.md), Milestone 1.
-- Triagem via pg_stat_user_tables cruzada com pg_constraint (2026-08-19):
-- estas 12 FKs, em 7 tabelas, tinham seq_scan alto (2.430 a 545.008) sem
-- indice cobrindo a coluna. Escrita nessas tabelas e baixa (25-459 inserts
-- acumulados), entao nao ha trade-off de custo de escrita relevante.
-- CREATE INDEX simples (nao CONCURRENTLY): tabelas tem 4 a 306 linhas, lock
-- e da ordem de milissegundos, e permite testar em begin/rollback.

create index if not exists lojas_owner_id_idx
  on public.lojas (owner_id);

create index if not exists produtos_categoria_id_idx
  on public.produtos (categoria_id);

create index if not exists produtos_subcategoria_id_idx
  on public.produtos (subcategoria_id);

create index if not exists vendas_futuras_produto_id_idx
  on public.vendas_futuras (produto_id);

create index if not exists compras_coletivas_criador_id_idx
  on public.compras_coletivas (criador_id);

create index if not exists compras_coletivas_regra_id_idx
  on public.compras_coletivas (regra_id);

create index if not exists compras_coletivas_loja_id_idx
  on public.compras_coletivas (loja_id);

create index if not exists pedidos_cliente_id_idx
  on public.pedidos (cliente_id);

create index if not exists afiliacoes_produto_id_idx
  on public.afiliacoes (produto_id);

create index if not exists conversas_pedido_id_idx
  on public.conversas (pedido_id);

create index if not exists conversas_loja_id_idx
  on public.conversas (loja_id);

create index if not exists conversas_produto_id_idx
  on public.conversas (produto_id);
