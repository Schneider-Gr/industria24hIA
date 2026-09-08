# Cobertura de entrega por produto

## MODIFIED Requirements

### Requirement: Produto fora da faixa é rotulado, não removido

A listagem DEVE exibir o produto cuja faixa de CEP não cobre o comprador, marcado como indisponível, e NÃO DEVE removê-lo da lista.

#### Scenario: comprador fora da faixa do produto
- **GIVEN** um produto com região "Manaus e região (AM)" e um comprador com CEP 90050-100
- **WHEN** a home, a categoria ou a busca é renderizada
- **THEN** o card do produto aparece com "Indisponível na sua região", sem botão de compra e sem preço promocional

#### Scenario: comprador dentro da faixa
- **GIVEN** o mesmo produto e um comprador com CEP 69088-068
- **WHEN** a listagem é renderizada
- **THEN** o card aparece normal, com os botões de compra

#### Scenario: comprador sem CEP informado
- **GIVEN** nenhum cookie `cep_comprador`
- **WHEN** a listagem é renderizada
- **THEN** nenhum produto é marcado, e a home mostra o card pedindo o CEP

#### Scenario: produto sem faixa declarada
- **GIVEN** um produto com `faixa_cep_id` nulo
- **WHEN** a listagem é renderizada para qualquer CEP
- **THEN** o card aparece normal
