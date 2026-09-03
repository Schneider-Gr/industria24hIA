## 1. Rate limit no bot de atendimento
- [x] 1.1 `src/app/api/bot/chat/route.ts` chama `checarLimite(`bot-chat:<user.id|ip>`, 12, 60_000)`
      antes de criar conversa / chamar o agente; excedente → `429`
- [x] 1.2 Teto de `mensagem` (2000 chars) → `400` antes da chamada ao agente
- [x] 1.3 `body` parseado com `.catch(() => null)` (antes um JSON malformado dava 500)
- [x] 1.4 `npm run lint` + `npm run test` + `npm run build` passando

## 2. Webhook Uber Direct fail-closed (código no PR #396)
- [ ] 2.1 Regravar `UBER_DIRECT_WEBHOOK_SIGNING_KEY` no Vercel (Production + Preview) com a Signing
      Key real do painel Uber Direct (Webhooks → endpoint → Editar) — **ação humana, faz antes do 2.2**
- [ ] 2.2 Mergear PR #396 (`fix/uber-direct-webhook-fail-closed`, Closes #395) — aplica limpo sobre master
- [ ] 2.3 Confirmar em prod: POST forjado sem assinatura → `401`; webhook real da Uber → `200` e status atualiza

## 3. Fechamento
- [ ] 3.1 Abrir PR do change 1 + spec
- [ ] 3.2 Após #396 mergear e a env estar regravada, arquivar este change

## Nota de sequenciamento
O passo 2.1 (env) tem de vir antes de 2.2 (merge). Se #396 mergear com a env ainda errada, o
webhook passa a rejeitar 100% dos requests silenciosamente (fail-closed) e a atualização de status
de entrega para até a env ser corrigida.
