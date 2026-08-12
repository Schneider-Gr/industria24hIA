## Purpose

Permite que o seller veja e responda, com evidência, a uma disputa aberta pelo
admin em um pedido da própria loja, antes de o admin decidir por estornar.

## ADDED Requirements

### Requirement: Seller visualiza disputas abertas nos próprios pedidos
O sistema SHALL exibir ao seller, restrito aos pedidos da(s) loja(s) dele, todo
pedido cujo `disputa_aberta_em` não seja nulo, incluindo a data de abertura e o
motivo registrado pelo admin.

#### Scenario: Pedido com disputa aparece para o seller dono da loja
- **WHEN** o admin executa `admin_abrir_disputa` em um pedido de uma loja do
  seller autenticado
- **THEN** o seller vê esse pedido listado como "disputa aberta" com data e
  motivo, na área dele

#### Scenario: Seller não vê disputa de pedido de outra loja
- **WHEN** um pedido com disputa aberta pertence a uma loja que não é do
  seller autenticado
- **THEN** a consulta do seller não retorna esse pedido

### Requirement: Seller responde a uma disputa com texto e evidência
O sistema SHALL permitir que o seller envie uma resposta em texto e, opcionalmente,
um ou mais anexos (imagem ou PDF) para uma disputa aberta em pedido da própria
loja, enquanto o pedido não tiver sido estornado (`status_pedido <> 'Cancelado'`).

#### Scenario: Seller envia resposta com anexo antes do estorno
- **WHEN** o seller envia texto e um anexo para um pedido com
  `disputa_aberta_em` preenchido e `status_pedido` diferente de `Cancelado`
- **THEN** o sistema grava a resposta e o anexo vinculados ao pedido e ao
  seller autor, com timestamp

#### Scenario: Seller tenta responder disputa de pedido já estornado
- **WHEN** o seller tenta enviar resposta a um pedido cujo `status_pedido`
  já é `Cancelado`
- **THEN** o sistema rejeita o envio e informa que a disputa já foi decidida

#### Scenario: Seller tenta responder disputa de loja de outro seller
- **WHEN** o seller autenticado não é dono da loja do pedido
- **THEN** o sistema rejeita o envio (RLS nega a escrita)

### Requirement: Admin vê a resposta do seller antes de decidir
O sistema SHALL exibir ao admin, na tela onde ele aciona `admin_estornar_pedido`
ou `admin_abrir_disputa`, qualquer resposta e anexo enviados pelo seller para
aquele pedido, antes de o admin confirmar a decisão.

#### Scenario: Resposta do seller visível na tela de decisão do admin
- **WHEN** o seller enviou uma resposta para um pedido com disputa aberta
- **THEN** o admin, ao abrir o detalhe desse pedido, vê o texto e os anexos
  enviados pelo seller

### Requirement: Seller é notificado quando uma disputa é aberta
O sistema SHALL notificar o seller, pelo canal já usado para notificações da
loja dele, quando uma disputa é aberta em um pedido da sua loja.

#### Scenario: Notificação disparada na abertura da disputa
- **WHEN** o admin executa `admin_abrir_disputa` em um pedido de uma loja
- **THEN** o seller dono da loja recebe uma notificação referenciando o
  pedido e o motivo da disputa
