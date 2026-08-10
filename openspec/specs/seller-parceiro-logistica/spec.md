# Seller Parceiro Logística Specification

## Purpose

Permite ao seller aprovar ou recusar solicitações de parceria comercial feitas
por representantes à própria loja. É um fluxo de aprovação de parceria/afiliação
por representante, distinto tanto do cadastro de afiliação de produto quanto do
cadastro de parceiro logístico usado em Rotas e Corridas.

## Requirements

### Requirement: Decisão sobre parceria pendente
O sistema SHALL permitir que o seller decida (aprovar ou recusar) uma solicitação
de parceria com status "Pendente".

#### Scenario: Parceria já decidida
- **WHEN** a parceria já tem status diferente de "Pendente"
- **THEN** nenhuma ação de decisão é exibida

#### Scenario: Status inválido na decisão
- **WHEN** a decisão tenta aplicar um status diferente de "Aprovada" ou "Recusada"
- **THEN** a operação é rejeitada
