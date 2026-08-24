## Purpose

Impedir que a decisão sugerida pelo agente de IA de curadoria de produto contradiga as
pendências (`gaps`) já calculadas pela regra de negócio determinística, reduzindo o efeito de uma
tentativa de prompt injection via descrição de produto.

## ADDED Requirements

### Requirement: Decisão sugerida da IA nunca aprova por cima de pendência determinística
O sistema SHALL rebaixar para `sugestao` qualquer decisão `aprovado` retornada pelo agente de IA
de curadoria sempre que existir ao menos um `gap` pendente calculado pela regra determinística
para aquele produto.

#### Scenario: Agente sugere aprovação sem pendência
- **WHEN** o agente de curadoria responde `APROVADO` e a lista de `gaps` calculada está vazia
- **THEN** a decisão sugerida permanece `aprovado`

#### Scenario: Agente sugere aprovação apesar de pendência existente
- **WHEN** o agente de curadoria responde `APROVADO` mas existe ao menos um `gap` pendente
  calculado pela regra determinística
- **THEN** a decisão sugerida é rebaixada para `sugestao`, mantendo o texto do parecer
