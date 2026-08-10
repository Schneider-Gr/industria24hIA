# Seller Leilões de Compradores Specification

## Purpose

Permite ao seller dar ou atualizar um lance em leilões abertos publicados por
compradores, competindo por preço, prazo e condições.

## Requirements

### Requirement: Listagem só de leilões abertos
O sistema SHALL listar apenas leilões com status aberto e janela ainda não
encerrada.

#### Scenario: Nenhum leilão aberto
- **WHEN** não há nenhum leilão aberto no momento
- **THEN** o sistema exibe um estado vazio "Nenhum leilão aberto no momento."

### Requirement: Dar ou atualizar lance
O sistema SHALL permitir ao seller dar um lance com preço, prazo e condições
opcionais, ou atualizar o lance já dado pela própria loja num leilão.

#### Scenario: Loja já tem lance no leilão
- **WHEN** a loja do seller já deu um lance neste leilão
- **THEN** o lance atual é exibido e a ação passa a ser "Atualizar lance" em vez de
  um novo lance

#### Scenario: Preço inválido
- **WHEN** o preço informado é menor ou igual a zero
- **THEN** o lance é rejeitado
