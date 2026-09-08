# Cobertura de entrega por produto

## ADDED Requirements

### Requirement: Produto herda a cobertura declarada pela loja

O produto sem `faixa_cep_id` DEVE herdar a faixa que a loja dele já usa na maioria dos outros produtos, quando essa maioria for inequívoca.

#### Scenario: loja com cobertura única
- **GIVEN** uma loja cujos produtos com faixa apontam todos para "Manaus e região (AM)"
- **WHEN** o backfill roda
- **THEN** os produtos dessa loja sem faixa passam a apontar para "Manaus e região (AM)"

#### Scenario: loja sem nenhuma cobertura declarada
- **GIVEN** uma loja em que nenhum produto tem faixa
- **WHEN** o backfill roda
- **THEN** os produtos dessa loja continuam sem faixa

#### Scenario: empate entre duas faixas
- **GIVEN** uma loja com o mesmo número de produtos em duas faixas diferentes
- **WHEN** o backfill roda
- **THEN** os produtos dessa loja continuam sem faixa, para revisão do seller

#### Scenario: produto recusado
- **GIVEN** um produto com `status_produto = 'Recusado'` e sem faixa
- **WHEN** o backfill roda
- **THEN** o produto continua sem faixa

### Requirement: Cadastro de produto exige região de entrega

O formulário de produto DEVE exigir a escolha de uma região de entrega e DEVE pré-selecionar a faixa mais usada pela loja.

#### Scenario: produto novo em loja que já declarou cobertura
- **GIVEN** um seller cuja loja usa "Acre (AC)" na maioria dos produtos
- **WHEN** ele abre o formulário de novo produto
- **THEN** "Acre (AC)" já vem selecionada no campo de região

#### Scenario: submit sem região
- **GIVEN** o formulário de produto com a região em branco
- **WHEN** o seller tenta salvar
- **THEN** o navegador barra o envio e cobra o campo
