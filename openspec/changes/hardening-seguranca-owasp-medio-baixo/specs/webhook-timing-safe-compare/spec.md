## Purpose

Alinhar a validação de token do webhook Asaas ao padrão já usado nos outros dois webhooks do
projeto (Uber Direct, BubbleWhats), eliminando a única comparação de segredo por `!==` simples
que resta no código de webhooks.

## ADDED Requirements

### Requirement: Validação do token do webhook Asaas é constant-time
O sistema SHALL comparar o header `asaas-access-token` recebido com `ASAAS_WEBHOOK_TOKEN` usando
`crypto.timingSafeEqual` (ou equivalente constant-time), em vez de comparação de string por
`!==`.

#### Scenario: Token correto
- **WHEN** o header `asaas-access-token` bate exatamente com `ASAAS_WEBHOOK_TOKEN`
- **THEN** a requisição é processada normalmente

#### Scenario: Token incorreto ou de tamanho diferente
- **WHEN** o header `asaas-access-token` não bate com `ASAAS_WEBHOOK_TOKEN`, incluindo o caso de
  tamanho diferente
- **THEN** a resposta é `401` sem vazar informação de tempo proporcional ao número de caracteres
  corretos
