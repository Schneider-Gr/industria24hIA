## Purpose

Garantir que o webhook do Uber Direct rejeite requisições quando não tem como validar a
assinatura, em vez de aceitar tudo — mesmo padrão já aplicado nos webhooks WhatsApp (#384) e
BubbleWhats. A correção de código está no PR #396; esta spec registra o comportamento esperado e a
dependência operacional.

## ADDED Requirements

### Requirement: Webhook Uber Direct é fail-closed sem signing key
O sistema SHALL rejeitar com `401` toda requisição a `POST /api/webhooks/uber-direct` quando
`UBER_DIRECT_WEBHOOK_SIGNING_KEY` estiver ausente ou vazia, registrando o evento no Sentry. NÃO
SHALL processar nenhuma atualização de `rota` nesse estado.

#### Scenario: Signing key ausente
- **WHEN** um POST chega e `UBER_DIRECT_WEBHOOK_SIGNING_KEY` está vazia
- **THEN** a resposta é `401` e nenhuma linha de `rotas` é alterada

#### Scenario: Assinatura válida com signing key configurada
- **WHEN** `UBER_DIRECT_WEBHOOK_SIGNING_KEY` tem a signing key real e o header `x-uber-signature`
  bate o HMAC-SHA256 do corpo
- **THEN** a requisição é processada e o status da `rota` é atualizado

#### Scenario: Assinatura inválida com signing key configurada
- **WHEN** a signing key está configurada e o header não bate o HMAC do corpo
- **THEN** a resposta é `401` (comparação constant-time), evento no Sentry, `rota` intacta
