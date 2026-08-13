## 1. Migration

- [x] 1.1 Checar colisão de número em todas as branches (skill `migrations-industria24`) — `0119` livre, sem prefixo duplicado
- [x] 1.2 Criar `0119_comissao_afiliado_exige_ref.sql` redefinindo `checkout_criar_pedido(jsonb, jsonb, text, text)`
- [x] 1.3 Testar em `begin; ...; select; rollback;` via `supabase db query --linked` — aplicou e reverteu sem erro
- [ ] 1.4 Rechecar colisão de número imediatamente antes do merge (outra sessão pode ter publicado 0119 depois da checagem inicial)
- [ ] 1.5 Aplicar em produção e confirmar via `db query --linked` que `prosrc` da função de 4 args contém o zeramento (não confiar em `migration list`)

## 2. Código

- [x] 2.1 Corrigir o comentário de `src/components/vitrine/CapturaRef.tsx` que descreve o fallback removido

## 3. Validação em produção

- [ ] 3.1 Compra de teste SEM link de afiliado → conferir no painel do afiliado que nenhuma venda nova aparece e que `repasse_afiliado` do item é 0
- [ ] 3.2 Compra de teste COM link válido (`?ref=` de afiliação Aprovada) → conferir que a venda aparece no painel do afiliado com a porcentagem da afiliação
- [ ] 3.3 Compra de teste com `?ref=` inválido → conferir que nenhum afiliado é creditado e que o checkout conclui sem erro
- [ ] 3.4 Compra de teste multiloja com link de uma das lojas → conferir que só os itens daquela loja creditam comissão
- [ ] 3.5 Conferir que os KPIs do painel (A receber / Já recebido / Vendas com meu código) continuam fechando com a soma do extrato

## 4. Decisões de negócio (fora deste change)

- [ ] 4.1 Dono decide se auto-afiliação (seller afiliado da própria loja) continua permitida
- [ ] 4.2 Dono decide se as 26 comissões já creditadas sem indicação são estornadas
- [ ] 4.3 Escopo próprio para comissão de afiliado logístico, hoje ausente de qualquer saldo
