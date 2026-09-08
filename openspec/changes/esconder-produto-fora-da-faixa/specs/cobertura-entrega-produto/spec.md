# Cobertura de entrega por produto

## MODIFIED Requirements

### Requirement: Produto fora da faixa não é exibido

A listagem NÃO DEVE exibir o produto cuja faixa de CEP declarada pelo seller não cobre o CEP do comprador.

#### Scenario: comprador fora da faixa do produto
- **GIVEN** um produto com região "Manaus e região (AM)" e um comprador com CEP 90050-100
- **WHEN** a home, a categoria ou a busca é renderizada
- **THEN** o produto não aparece na listagem

#### Scenario: comprador dentro da faixa
- **GIVEN** o mesmo produto e um comprador com CEP 69088-068
- **WHEN** a listagem é renderizada
- **THEN** o produto aparece normal, com os botões de compra

#### Scenario: comprador sem CEP informado
- **GIVEN** nenhum cookie `cep_comprador`
- **WHEN** a listagem é renderizada
- **THEN** todos os produtos aparecem, e a home mostra o card pedindo o CEP

#### Scenario: nenhum produto cobre a região
- **GIVEN** um comprador com CEP 01310-100, que nenhuma faixa cadastrada cobre
- **WHEN** a home é renderizada
- **THEN** a listagem fica vazia e a home mostra "Nenhum produto disponível ainda"

#### Scenario: galeria sem produto restante
- **GIVEN** uma galeria cujos produtos estão todos fora da faixa do comprador
- **WHEN** a home é renderizada
- **THEN** a galeria inteira não é renderizada
