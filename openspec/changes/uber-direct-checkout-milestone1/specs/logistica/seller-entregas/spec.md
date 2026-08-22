## Purpose

Dá ao seller visibilidade sobre a entrega dos próprios pedidos pagos, tanto pela corrida automática interna quanto pela Uber Direct, hoje invisíveis para ele.

## ADDED Requirements

### Requirement: Seller vê as corridas automáticas dos próprios pedidos
O sistema SHALL permitir que o dono da loja veja as corridas de despacho automático (afiliado/pool geral de parceiros) associadas a pedidos da própria loja.

#### Scenario: Pedido pago com corrida despachada
- **WHEN** o seller acessa o painel de entregas da própria loja
- **THEN** vê a lista de corridas de pedidos dessa loja, com origem, destino, status e frete calculado

### Requirement: Seller vê as entregas Uber Direct dos próprios pedidos
O sistema SHALL permitir que o dono da loja veja o status e o link de rastreio das entregas Uber Direct associadas a pedidos da própria loja.

#### Scenario: Pedido despachado via Uber Direct
- **WHEN** um pedido da loja do seller foi despachado via Uber Direct
- **THEN** o seller vê o status da entrega e, se disponível, um link de rastreio no painel de entregas
