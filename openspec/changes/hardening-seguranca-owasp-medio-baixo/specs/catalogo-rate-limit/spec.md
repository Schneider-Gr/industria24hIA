## Purpose

Aplicar o rate limit já disponível no projeto (`src/lib/rate-limit.ts`) às rotas públicas de
catálogo que hoje fazem query direta ao Supabase sem nenhum limite de chamadas, alinhando-as ao
padrão já usado em `/api/checkout/cotar-frete`.

## ADDED Requirements

### Requirement: Rotas públicas de catálogo têm rate limit por IP
O sistema SHALL aplicar `checarLimite` (janela deslizante em memória) por IP de origem em `GET
/api/categorias` e `GET /api/busca-preview`, retornando `429` quando o limite for excedido.

#### Scenario: Chamadas dentro do limite
- **WHEN** um IP chama `/api/categorias` ou `/api/busca-preview` dentro do limite configurado na
  janela de tempo
- **THEN** a resposta é `200` com os dados normais

#### Scenario: Chamadas acima do limite
- **WHEN** um IP excede o número de chamadas permitido na janela de tempo configurada
- **THEN** as chamadas excedentes recebem `429` sem consultar o Supabase
