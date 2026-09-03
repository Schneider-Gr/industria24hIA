## Why

`public.repasses` (migration 0084) só tem a policy `repasses_admin_all` (`is_admin()`). Com o dashboard do seller (#490) exibindo repasses, a fonte teve que ser `linha_itens.repasse_vendedor` — o valor *devido* sobre vendas pagas, não o que de fato foi transferido pelo ledger. O seller (e o afiliado) não têm como ver o próprio repasse real. Confirmado pelo dono nesta sessão (2026-09-03).

## What Changes

- **Migration 0155**: duas policies **somente SELECT** em `public.repasses`:
  - `repasses_seller_read` — o dono da loja lê os repasses `loja_id` da própria loja.
  - `repasses_afiliado_read` — o afiliado lê os repasses onde `afiliado_id = auth.uid()`.
  - Nenhuma escrita nova é liberada; o ledger continua populado só pelas funções `SECURITY DEFINER` e pelo admin.
- **Dashboard do seller**: o card "Repasse sobre vendas pagas" (de `linha_itens`) vira "Repasses recebidos" — Σ `repasses.valor` com `destino='seller'`, `loja_id` da loja, `status='transferido'` e `transferido_em` na janela, com Δ vs. período anterior. O hint mostra o total ainda `pendente` (saldo corrente).

## Non-goals

- Não implementa transferência PIX nem qualquer escrita no ledger.
- Não expõe repasses de outra loja/afiliado (as policies são estritamente por dono).
- Não altera as telas de admin (já cobertas por `repasses_admin_all`).

## Capabilities

### Modified Capabilities
- `admin-dashboard-kpis`: o KPI de repasse do seller passa a refletir o ledger real de transferências.

## Impact

- `supabase/migrations/0155_repasses_seller_afiliado_read.sql` (novo) — caminho do dinheiro (RLS em `repasses`), validado em `begin; … rollback;`.
- `src/app/(seller)/seller/page.tsx` — troca a leitura de `linha_itens.repasse_vendedor` por `repasses`; remove o cálculo de "pago" que só servia àquele card.
- Sem mudança de schema, sem novas colunas.
