# Seller Afiliados Produtos Specification

## Purpose

Permite ao seller moderar (aprovar ou suspender) as solicitações de afiliação já
feitas por terceiros aos produtos da própria loja. A configuração de quais
produtos permitem afiliação e o percentual de comissão fica no cadastro de
Produtos, não nesta área.

## Requirements

### Requirement: Moderação de afiliação restrita ao dono da loja ou do produto
O sistema SHALL exibir e permitir moderar apenas afiliações vinculadas a produtos
ou à loja do usuário autenticado.

#### Scenario: Afiliação sem efeito ao atualizar
- **WHEN** uma tentativa de moderação atualiza zero linhas (afiliação de outra
  loja ou inexistente)
- **THEN** o sistema reporta falha explícita, em vez de indicar sucesso

### Requirement: Aprovar afiliação pendente
O sistema SHALL permitir que o seller aprove uma afiliação com status diferente de
"Aprovada".

#### Scenario: Afiliação já aprovada
- **WHEN** a afiliação já está com status "Aprovada"
- **THEN** a opção de aprovar não é exibida

### Requirement: Suspender afiliação ativa
O sistema SHALL permitir que o seller suspenda uma afiliação com status diferente
de "Suspensa".

#### Scenario: Afiliação já suspensa
- **WHEN** a afiliação já está com status "Suspensa"
- **THEN** a opção de suspender não é exibida

#### Scenario: Status inválido
- **WHEN** uma moderação tenta aplicar um status diferente de "Aprovada" ou
  "Suspensa"
- **THEN** o sistema rejeita a operação
