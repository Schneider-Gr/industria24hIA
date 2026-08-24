## ADDED Requirements

### Requirement: Rotas de API não expõem mensagem de erro interna ao client
Toda rota em `src/app/api/**/route.ts` que capture um erro de banco (Postgres/Supabase) DEVE
responder ao client com uma mensagem genérica, nunca com `error.message` cru.

#### Scenario: Query ao Supabase falha numa rota de API
- **WHEN** uma query/RPC do Supabase retorna erro dentro de um route handler
- **THEN** a resposta JSON ao client contém uma mensagem genérica (ex.: "Erro ao processar
  requisição") e o `error.message` original é enviado a `Sentry.captureException`, não ao body da
  resposta
