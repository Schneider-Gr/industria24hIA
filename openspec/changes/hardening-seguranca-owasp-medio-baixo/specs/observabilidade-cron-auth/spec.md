## Purpose

Alinhar `src/app/api/observabilidade/cron/route.ts` ao padrão de autenticação já usado pelas
demais rotas de cron do projeto, em vez de expor histórico de execução sem checagem alguma.

## ADDED Requirements

### Requirement: Histórico de execução de cron exige autenticação
O sistema SHALL exigir header `Authorization: Bearer <token>` válido para responder `GET
/api/observabilidade/cron`, no mesmo padrão de token usado em
`/api/carrinho/abandono/tick` e `/api/coletivas/tick`.

#### Scenario: Requisição sem token
- **WHEN** `GET /api/observabilidade/cron` é chamado sem header `Authorization` ou com token
  inválido
- **THEN** a resposta é `401` e nenhum dado de execução é retornado

#### Scenario: Requisição com token válido
- **WHEN** `GET /api/observabilidade/cron` é chamado com `Authorization: Bearer <token>` correto
- **THEN** a resposta é `200` com o histórico de execução de crons
