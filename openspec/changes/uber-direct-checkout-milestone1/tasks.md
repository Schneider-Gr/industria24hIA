## 1. Schema e RPC

- [x] 1.1 Migration `0139_uber_direct_transportadora.sql`: `fonte='uber_direct'` no check de `transportadoras`, linha global inserida, tabela `cotacoes_frete_externo`.
- [x] 1.2 Migration `0140_checkout_cotacao_uber_direct.sql`: função `cotar_frete_interno`, `checkout_criar_pedido` com `p_cotacao_externa_id`.
- [x] 1.3 Migration `0141_corridas_seller_read.sql`: policy `corridas_seller_read`.
- [ ] 1.4 Testar as três migrations em `begin;...rollback;` via `supabase db query --linked --file` antes de aplicar em produção (regra do projeto para DDL/DML com dado real).
- [ ] 1.5 Aplicar as três migrations em produção e confirmar no schema real (`db query --linked`).

## 2. Cotação de frete

- [x] 2.1 `src/lib/checkout/opcoes-frete.ts` + `.test.ts` (montagem das opções, interna vs. Uber Direct).
- [x] 2.2 Rota `POST /api/checkout/cotar-frete` (cota interno via RPC, cota Uber Direct real quando não há cobertura, grava `cotacoes_frete_externo`).
- [x] 2.3 `npm run test` verde (65/65 testes, incluindo os 5 novos de `opcoes-frete.test.ts`).

## 3. Checkout

- [x] 3.1 `src/app/checkout/page.tsx`: cotação real por loja (debounced), substituindo a estimativa flat de 10% assim que a cotação completa, bloqueio de "Continuar" sem opção de frete.
- [x] 3.2 `src/app/checkout/actions.ts`: `transportadora_id`/`cotacao_uber_direct_id` por loja passados ao RPC.
- [x] 3.3 `npx tsc --noEmit` e `npm run lint` limpos.

## 4. Despacho pós-pagamento e painel do seller

- [x] 4.1 `src/app/api/asaas/webhook/route.ts`: sinal explícito (transportadora Uber Direct em `linha_itens`) substitui a heurística de "corrida não criada"; pula a corrida automática quando o sinal está presente.
- [x] 4.2 `src/app/(seller)/seller/entregas/page.tsx` (novo) + item de navegação em `Sidebar.tsx`.

## 5. Pendências operacionais (ação humana, fora do código deste change)

- [ ] 5.1 Corrigir `UBER_DIRECT_WEBHOOK_SIGNING_KEY` no Vercel (Production + Preview) com a Signing Key real do painel Uber Direct (Webhooks → entrada do endpoint → Editar) — hoje gravada com o valor do `client_secret`, o que está errado. Comentário do achado já em `src/app/api/webhooks/uber-direct/route.ts`.
- [ ] 5.2 Reembolso Uber Direct: habilitar acesso comercial à Refund API junto ao representante Uber, e confirmar o contrato real (endpoint, formato do valor, enum de motivos) antes de codar — não implementado nesta rodada por não ser possível confirmar contra a doc oficial (SPA).

## 6. Verificação ponta a ponta (antes de fechar o milestone)

- [ ] 6.1 Pedido sintético em loja de teste sem transportadora interna cobrindo o CEP, cotação real via `/api/checkout/cotar-frete` contra o sandbox Uber Direct.
- [ ] 6.2 Confirmação de pagamento simulada no webhook do Asaas; checar via `supabase db query --linked` que `linha_itens.transportadora_id` aponta pra Uber Direct, nenhuma `corrida` foi publicada, e uma `rotas` com `uber_delivery_id` foi criada.
- [ ] 6.3 Conferir `/seller/entregas` mostrando a entrega do pedido de teste.
