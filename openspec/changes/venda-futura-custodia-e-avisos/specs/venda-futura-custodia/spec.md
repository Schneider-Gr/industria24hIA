## ADDED Requirements

### Requirement: Entrega de venda futura exige o código do comprador
O sistema SHALL aceitar a transição de `entregas.status` para `Entregue` de um
item com `venda_futura_id` somente pelas rotinas que validam o código do
comprador (`pedido_confirmar_entrega`, `pedido_confirmar_entrega_publico`) ou
por um admin. Escrita direta do seller ou do afiliado logístico SHALL ser
recusada com mensagem que orienta a pedir o código.

#### Scenario: Seller marca o checkbox de entregue
- **WHEN** o dono da loja grava `Entregue` num item de venda futura pelo painel
- **THEN** a gravação é recusada e o item continua pendente

#### Scenario: Seller confirma com o código do comprador
- **WHEN** o seller informa o código correto do pedido
- **THEN** o item fica `Entregue` e o repasse é disparado como hoje

#### Scenario: Pedido comum
- **WHEN** o item não tem `venda_futura_id`
- **THEN** o checkbox do seller segue funcionando como antes

### Requirement: Repasse da venda futura só depois da entrega com código
O pagamento de pedido com venda futura SHALL ficar na conta da plataforma até
a entrega confirmada com código; `repasse_solicitar_pedido` e o disparo
automático SHALL continuar recusando pedido com item não entregue.

#### Scenario: Solicitar repasse antes da entrega
- **WHEN** o seller pede o repasse de um pedido de venda futura pago e não entregue
- **THEN** a RPC recusa com "Repasse so pode ser solicitado depois que a entrega do pedido for confirmada."

### Requirement: Aviso de reserva confirmada no pagamento
Na confirmação de pagamento de pedido com item de venda futura, o sistema SHALL
enviar por WhatsApp ao comprador e ao seller uma mensagem de reserva confirmada
com produto, quantidade e data prevista. A do comprador SHALL incluir o código
de entrega e dizer que o pagamento fica retido até a entrega; a do seller SHALL
dizer que o repasse sai após a confirmação com o código.

#### Scenario: Compra paga de venda futura
- **WHEN** o Asaas confirma o pagamento de um pedido com item de venda futura
- **THEN** comprador e seller recebem a mensagem de reserva confirmada, uma vez cada

#### Scenario: Pedido sem venda futura
- **WHEN** o pedido pago não tem item de venda futura
- **THEN** os avisos de pagamento seguem iguais aos de hoje

### Requirement: Avisos de véspera e do dia só para reserva paga e pendente
O cron de avisos SHALL considerar apenas itens de pedidos com status
`Pagamento Realizado`, `Em Separação` ou `Enviado` e sem entrega `Entregue` em
`entregas`, e SHALL avisar comprador e seller 2 dias antes e no dia da data
prevista.

#### Scenario: Pedido cancelado com data de amanhã
- **WHEN** o pedido de uma reserva está `Cancelado` ou `Aguardando Pagamento`
- **THEN** nenhum aviso é enviado

#### Scenario: Reserva paga a 2 dias da data
- **WHEN** a reserva está paga, não entregue, e a data prevista é daqui a 2 dias
- **THEN** comprador e seller recebem o aviso de véspera, uma vez

### Requirement: Pedido de venda futura destacado nas listas
As listas de pedidos do seller, do comprador (`meus-pedidos`) e do admin SHALL
exibir o ícone de venda futura no pedido que tem ao menos um item de venda futura.

#### Scenario: Pedido com reserva na lista do seller
- **WHEN** o seller abre `/seller/pedidos`
- **THEN** o pedido com item de venda futura mostra o ícone com o rótulo "Venda futura"
