## 1. Migration

- [x] 1.1 `0155_repasses_seller_afiliado_read.sql`: policies `repasses_seller_read` (dono da loja) e `repasses_afiliado_read` (afiliado), só SELECT
- [x] 1.2 Validar em `begin; … rollback;` via `supabase db query --linked` (3 policies presentes após apply)
- [x] 1.3 Sem colisão de número (`ls | grep -oE '^[0-9]{4}' | sort | uniq -d` vazio; nenhum 0155 em qualquer branch)
- [ ] 1.4 Aplicar em prod via `supabase db query --linked` e confirmar as 3 policies com `pg_policy`

## 2. Dashboard do seller

- [x] 2.1 Card "Repasses recebidos": Σ `repasses` `destino='seller'` + `loja_id` + `status='transferido'` + `transferido_em` na janela, com Δ
- [x] 2.2 Hint com o total `pendente` (saldo corrente, sem janela)
- [x] 2.3 Remover a leitura de `linha_itens.repasse_vendedor` e o filtro `pago` órfão

## 3. Verificação

- [x] 3.1 `tsc --noEmit`, `eslint`, `vitest` (9/9 dashboard-kpis) limpos
- [x] 3.2 `next build` limpo
- [ ] 3.3 QA no preview: seller vê "Repasses recebidos" (hoje R$ 0,00 realizado / R$ 21,45 pendente no afiliado, seller sem repasse pendente em prod — a loja de teste não tem repasse transferido)
- [ ] 3.4 Branch + PR (`Closes #493`), CI verde, merge

## 4. Fechamento

- [ ] 4.1 `openspec archive repasses-rls-seller-afiliado` após merge
