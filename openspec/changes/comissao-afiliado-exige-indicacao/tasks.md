## 1. Migration

- [x] 1.1 Checar colisão de número em todas as branches (skill `migrations-industria24`) — `0119` livre
- [x] 1.2 Criar `0119_comissao_afiliado_exige_ref.sql` redefinindo `checkout_criar_pedido(jsonb, jsonb, text, text)`
- [x] 1.3 Testar em `begin; ...; select; rollback;` via `supabase db query --linked`
- [x] 1.4 Recheque de colisão antes do merge — sem duplicidade
- [x] 1.5 Aplicada em produção e confirmada por `prosrc`
- [x] 1.6 **Hotfix 0120**: a 0119 recriou a função com `ref text default null`, o que tornou a chamada interna de 3 args ambígua (`42725: is not unique`) e derrubou TODO o checkout (caminho real 6 → 5 → 4 → 3). Corrigido removendo o default; checkout revalidado

## 2. Código

- [x] 2.1 Corrigir o comentário de `src/components/vitrine/CapturaRef.tsx` que descrevia o fallback removido

## 3. Validação em produção

Feita chamando a RPC dentro de transação abortada — nada persistiu. Cobre mais que a UI daria, e sem preencher documento em formulário.

- [x] 3.1 SEM link → não credita, `repasse_afiliado` 0.00
- [x] 3.2 COM link válido (`OAQC93Q8VU`) → credita, repasse 0.26 = 5% de 5.10
- [x] 3.3 Link inválido (`XXINVALIDO9`) → não credita, 0.00, sem erro para o comprador
- [x] 3.4 Link de OUTRA loja → não credita, 0.00. Carrinho multiloja não existe no sistema: a RPC recusa com "O carrinho deve conter itens de uma única loja", e o checkout faz uma chamada por loja
- [x] 3.5 KPIs conferidos contra o banco para o afiliado do QA: a receber 6.49, já recebido 0.52, 26 vendas — batem exatamente com o painel

## 4. Decisões de negócio (fora deste change)

- [ ] 4.1 Dono decide se auto-afiliação (seller afiliado da própria loja) continua permitida
- [~] 4.2 Estorno das 35 linhas de auto-afiliação (R$ 14,53): SQL pronto e validado em begin/rollback, **segurado por decisão do dono** — será decidido junto com o caso maior
- [x] 4.3 As 31 linhas de afiliados legítimos (R$ 631,74): **não estornar**, decisão definitiva — sem prova de que vieram do fallback
- [ ] 4.4 Escopo próprio para comissão de afiliado logístico, hoje ausente de qualquer saldo

## 5. Lição para o time

- [x] 5.1 Migration que recria função **sobrecarregada** exige teste de CHAMADA, não de existência. O `begin/rollback` original só verificou que o `prosrc` continha o texto certo e passou verde com o checkout quebrado
