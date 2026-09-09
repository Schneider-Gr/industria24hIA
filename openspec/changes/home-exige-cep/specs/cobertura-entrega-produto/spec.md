# Cobertura de entrega por produto

## MODIFIED Requirements

### Requirement: A home exige o CEP para listar produto

A home NÃO DEVE renderizar seção de produto enquanto o comprador não informar o CEP, e DEVE pedir o CEP no lugar.

#### Scenario: visitante sem CEP
- **GIVEN** nenhum cookie `cep_comprador`
- **WHEN** a home é renderizada
- **THEN** nenhum card de produto aparece, e o portão de CEP e o card de localização são exibidos

#### Scenario: visitante logado sem CEP
- **GIVEN** sessão aberta e nenhum cookie `cep_comprador`
- **WHEN** a home é renderizada
- **THEN** o comportamento é o mesmo do visitante anônimo: nenhum produto e o pedido de CEP

#### Scenario: CEP informado
- **GIVEN** um cookie `cep_comprador` com CEP coberto por alguma faixa
- **WHEN** a home é renderizada
- **THEN** as seções de produto aparecem, já filtradas pela cobertura

#### Scenario: busca continua aberta
- **GIVEN** nenhum cookie `cep_comprador`
- **WHEN** o visitante abre `/busca?q=alface`
- **THEN** os resultados aparecem, porque a restrição vale só para a home
