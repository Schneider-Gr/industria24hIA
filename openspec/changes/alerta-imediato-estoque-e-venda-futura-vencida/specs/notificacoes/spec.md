# Notificações ao seller

## ADDED Requirements

### Requirement: Alerta imediato de estoque crítico

O sistema SHALL avisar o seller, no fluxo de confirmação do pagamento, quando um
pedido levar um produto a estado crítico ou esgotado.

#### Scenario: Venda derruba o produto abaixo do limiar

- **WHEN** um pagamento é confirmado e um produto do pedido passa a ter saldo
  menor ou igual à sua `quantidade_minima` (ou a 5, quando não declarada)
- **THEN** o seller recebe um aviso por WhatsApp e por e-mail, com o produto e o
  saldo restante

#### Scenario: Produto já estava crítico antes da venda

- **WHEN** o produto já estava em estado crítico ou esgotado antes deste pedido
- **THEN** nenhum aviso imediato é enviado, e o produto segue no resumo diário

#### Scenario: Um pedido derruba vários produtos

- **WHEN** um mesmo pedido leva mais de um produto a crítico ou esgotado
- **THEN** o seller recebe um único aviso com a lista, nunca um aviso por produto

#### Scenario: Envio falha

- **WHEN** o envio do WhatsApp ou do e-mail falha
- **THEN** a confirmação do pagamento permanece registrada e o erro é observado,
  sem reverter o pedido

#### Scenario: Loja sem WhatsApp cadastrado

- **WHEN** a loja não tem WhatsApp
- **THEN** o aviso sai apenas por e-mail, sem erro

#### Scenario: Teto diário atingido

- **WHEN** a loja já recebeu o número máximo de avisos imediatos no dia
- **THEN** o aviso é suprimido e os produtos seguem no resumo diário

### Requirement: Venda futura vencida

O sistema SHALL avisar seller e administrador quando um item de venda futura
passar da data prevista sem ter sido entregue.

#### Scenario: Previsão vencida e item não entregue

- **WHEN** o dia seguinte à data prevista chega e o item não está entregue
- **THEN** seller e administrador recebem um aviso, uma única vez por item,
  informando pedido, produto e dias de atraso

#### Scenario: Item entregue no prazo

- **WHEN** o item foi entregue até a data prevista
- **THEN** nenhum aviso de atraso é enviado

#### Scenario: Pedido cancelado

- **WHEN** o pedido do item foi cancelado
- **THEN** nenhum aviso de atraso é enviado

### Requirement: Fila de vendas futuras atrasadas

O sistema SHALL oferecer ao administrador uma lista das vendas futuras vencidas
e não entregues.

#### Scenario: Existem itens atrasados

- **WHEN** o administrador abre a fila
- **THEN** vê item, pedido, loja, comprador, data prevista e dias de atraso,
  ordenados do maior atraso para o menor

#### Scenario: Nenhum item atrasado

- **WHEN** não há item vencido
- **THEN** a tela informa que não há atraso, sem aparentar erro
