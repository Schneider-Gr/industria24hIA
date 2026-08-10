# Seller Pedidos Specification

## Purpose

Permite ao seller acompanhar e operar o ciclo de vida dos pedidos da própria
loja: confirmar entrega por código, marcar itens entregues, avançar status e
cancelar pedidos, com repasse financeiro disparado automaticamente na
confirmação.

## Requirements

### Requirement: Confirmação de retirada/entrega por código
O sistema SHALL permitir confirmar a entrega de um pedido com status "Pagamento
Realizado" informando um código de confirmação.

#### Scenario: Código incorreto
- **WHEN** o código informado não confere
- **THEN** a confirmação é rejeitada com erro "Código de retirada incorreto.",
  sem reverter nenhuma contagem de tentativas associada

#### Scenario: Confirmação bem-sucedida dispara repasse
- **WHEN** a confirmação de entrega é aceita
- **THEN** o sistema dispara o repasse financeiro automático do pedido; uma falha
  nesse disparo não desfaz a confirmação já registrada

### Requirement: Marcar item como entregue
O sistema SHALL permitir marcar (ou desmarcar) individualmente cada item de um
pedido como entregue, restrito a itens de pedidos da própria loja.

#### Scenario: Item de outra loja
- **WHEN** a marcação de entrega é tentada para um item que não pertence a um
  pedido da loja do seller
- **THEN** o sistema rejeita com erro explícito

### Requirement: Avançar status do pedido em sequência
O sistema SHALL permitir avançar o status do pedido apenas na sequência
"Pagamento Realizado" → "Em Separação" → "Enviado", sem permitir pular etapa.

#### Scenario: Pedido já enviado ou cancelado
- **WHEN** o pedido já está com status "Enviado" ou "Cancelado"
- **THEN** a ação de avançar status não é exibida

### Requirement: Cancelamento de pedido com motivo obrigatório
O sistema SHALL permitir cancelar um pedido em qualquer status anterior a
"Enviado", exigindo motivo não vazio, restrito ao admin ou ao seller dono da loja.

#### Scenario: Pedido já enviado
- **WHEN** o pedido já está com status "Enviado" ou "Cancelado"
- **THEN** a ação de cancelar não é exibida

#### Scenario: Cancelamento repõe estoque, não estorna automaticamente
- **WHEN** um pedido é cancelado
- **THEN** o estoque dos itens é reposto; o estorno financeiro via gateway de
  pagamento não é automático nesta ação
