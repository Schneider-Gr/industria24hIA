-- 0082: comissão da plataforma sobre o frete pago ao parceiro/afiliado
-- logístico. Decisão do dono (24/07/2026): 10% de comissão padrão.
--
-- Colunas geradas (não uma nova coluna gravada pela RPC/app): recalculam
-- sozinhas sempre que preco_final muda, cobrindo tanto o despacho automático
-- (0079) quanto o fluxo de leilão manual (0040, que atualiza preco_final ao
-- aceitar lance) sem precisar tocar em nenhuma das duas RPCs.
alter table public.corridas
  add column if not exists comissao_pct numeric(5,2) not null default 10.00,
  add column if not exists valor_parceiro numeric(12,2)
    generated always as (round(preco_final * (1 - comissao_pct / 100.0), 2)) stored,
  add column if not exists comissao_valor numeric(12,2)
    generated always as (round(preco_final * (comissao_pct / 100.0), 2)) stored;
