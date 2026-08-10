# Seller Centro de Distribuição Specification

## Purpose

Permite ao seller cadastrar e excluir centros de distribuição da própria loja,
usados para vincular produtos a locais de origem/estoque.

## Requirements

### Requirement: CRUD de centro restrito à própria loja
O sistema SHALL permitir criar e excluir centros de distribuição apenas para a
loja do usuário autenticado, resolvendo a loja explicitamente por dono no código
da aplicação, e não apenas confiando na política de acesso do banco.

#### Scenario: Nome obrigatório
- **WHEN** o nome do centro não é informado
- **THEN** a criação é rejeitada

#### Scenario: Localização opcional
- **WHEN** a localização não é informada
- **THEN** o centro é criado normalmente, com localização vazia
