# Seller Crédito Specification

## Purpose

Permite ao seller solicitar antecipação/linha de crédito para a própria loja e
cancelar uma solicitação ainda pendente. A decisão de aprovar ou recusar é
exclusiva de admin.

## Requirements

### Requirement: Solicitar crédito
O sistema SHALL permitir que o seller com loja cadastrada solicite crédito
informando um valor maior que zero, com finalidade e prazo em meses opcionais.

#### Scenario: Sem loja cadastrada
- **WHEN** o usuário autenticado ainda não tem loja
- **THEN** a solicitação é rejeitada com "Cadastre sua loja antes de solicitar
  crédito."

#### Scenario: Valor inválido
- **WHEN** o valor solicitado não é maior que zero
- **THEN** a solicitação é rejeitada com "Informe um valor válido."

### Requirement: Cancelar solicitação pendente
O sistema SHALL permitir que o seller cancele apenas uma solicitação de crédito
com status "Pendente" — solicitações já decididas por admin não podem ser
canceladas pelo seller.

#### Scenario: Solicitação não pendente
- **WHEN** a solicitação já tem um status diferente de "Pendente"
- **THEN** a ação de cancelar não é exibida

### Requirement: Decisão de aprovação exclusiva de admin
O sistema SHALL reservar a decisão de aprovar ou recusar uma solicitação de
crédito exclusivamente ao admin — o seller nunca vê ação de aprovar/recusar a
própria solicitação.

#### Scenario: Solicitação aprovada ou recusada
- **WHEN** uma solicitação de crédito tem status diferente de "Pendente" (ex.:
  aprovada ou recusada por admin)
- **THEN** o seller vê apenas o status como informação, sem nenhuma ação
  disponível sobre essa solicitação
