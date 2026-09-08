## 1. Backfill

- [x] 1.1 Escrever `0166_backfill_faixa_cep_produto.sql` com herança pela moda da loja → verificar: moda ambígua e produto recusado ficam de fora
- [x] 1.2 Testar em produção com `begin; … rollback;` → verificar: 154 → 25 sem faixa, 69 → 23 aprovados sem faixa, dado original intacto após o rollback
- [ ] 1.3 Aplicar em produção → verificar: `db query --linked` confirma 181 produtos com faixa

## 2. Cadastro novo

- [x] 2.1 `faixa_cep_id` obrigatório no `ProdutoForm`, com a faixa modal da loja pré-selecionada → verificar: `tsc --noEmit` limpo
- [ ] 2.2 QA no painel do seller → verificar: produto novo nasce com a região da loja marcada e o submit sem região é barrado

## 3. Comunicação e fecho

- [ ] 3.1 Avisar os 4 sellers (Cerâmica Iguatú, Hidropônicos Buriti, Viva Ecológica, Yupi Geladinho) para revisar a cobertura herdada
- [ ] 3.2 Despublicar os produtos das lojas de teste → verificar: zero produto aprovado sem faixa
- [ ] 3.3 Só então virar o fail-closed em `faixa-cep-produto.ts` (change à parte)
