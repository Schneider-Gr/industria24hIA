# Seller Carrinhos Abandonados Specification

## Purpose

Dá ao seller visibilidade somente-leitura dos carrinhos abandonados que contêm
itens da própria loja, incluindo status de lembrete enviado e conversão.

## Requirements

### Requirement: Leitura restrita aos itens da própria loja
O sistema SHALL exibir apenas os carrinhos abandonados que contêm ao menos um
item de produto da loja do seller autenticado, acessando o dado por uma função
dedicada em vez de leitura direta da tabela — carrinho é dado do comprador, não
do seller.

#### Scenario: Nenhum carrinho abandonado
- **WHEN** não há carrinho abandonado com item da loja do seller
- **THEN** o sistema exibe estado vazio "Nenhum carrinho abandonado com itens da
  sua loja no momento."

### Requirement: Página somente leitura
O sistema SHALL exibir comprador, itens, data de abandono, status de lembrete
enviado e status de conversão, sem oferecer nenhuma ação de escrita ao seller
nesta tela.

#### Scenario: Nenhuma ação de escrita disponível
- **WHEN** o seller visualiza a listagem de carrinhos abandonados
- **THEN** não há botão de enviar lembrete, marcar como convertido ou qualquer
  outra ação de escrita — a tela é somente leitura
