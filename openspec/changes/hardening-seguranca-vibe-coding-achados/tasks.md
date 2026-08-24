## 1. Identidade no bot WhatsApp
- [x] 1.1 Filtrar `buscarPedido`/`listarPedidos` (webhook WhatsApp) por `telefone_contato = telefone da conversa`
- [x] 1.2 Confirmar índice existente em `pedidos(telefone_contato)` é suficiente (não criar migration se já cobre) — coluna sem índice dedicado, mas filtro é por igualdade após leitura já escopada por `cliente_id`/`id_venda`; sem impacto de performance perceptível, não precisa de migration nova.

## 2. Ownership de crédito
- [x] 2.1 `cancelarCredito` filtra por `loja_id` do usuário e trata 0 linhas afetadas como erro

## 3. Decisão da IA de curadoria
- [x] 3.1 `parseRespostaProduto`/`gerarParecerProduto` rebaixa `aprovado` para `sugestao` quando `gaps.length > 0`
- [x] 3.2 `.test.ts` cobrindo os 2 cenários da spec (5 testes: parse + 3 cenários de rebaixamento)

## 4. Cobertura Gitleaks
- [x] 4.1 Regras dedicadas para Asaas, LangSmith, WhatsApp/Meta, Resend, Supabase service role em `.gitleaks.toml`

## 5. Fechamento
- [x] 5.1 `npm run lint` + `npm run test` passando (63/63 testes, lint sem warnings nos arquivos alterados)
- [ ] 5.2 Abrir PR referenciando Issue #375
