## ADDED Requirements

### Requirement: Solicitação de repasse pelo seller
O sistema SHALL permitir que o seller dono da loja solicite o repasse de um
pedido cujo pagamento está confirmado e cuja entrega já foi confirmada em todos
os itens. A solicitação SHALL recalcular o ledger de repasses do pedido e
submeter as linhas de destino `seller` ao mesmo fluxo de transferência PIX já
usado pelo gatilho automático de confirmação de entrega. A solicitação NÃO
antecipa valor: ela é o caminho manual para um repasse que já está elegível e
cujo disparo automático não se concluiu.

#### Scenario: Pedido pago e entregue, repasse ainda não transferido
- **WHEN** o seller aciona a solicitação de repasse em um pedido da própria loja
  com pagamento confirmado, entrega confirmada em todos os itens e sem repasse
  de seller já transferido
- **THEN** o ledger do pedido é recalculado e a transferência ao seller é
  submetida, e a ação deixa de ser oferecida para aquele pedido

#### Scenario: Pedido ainda não pago
- **WHEN** o pedido não tem pagamento confirmado
- **THEN** a ação de solicitar repasse não é oferecida e uma tentativa direta é
  rejeitada

#### Scenario: Pedido pago mas ainda não entregue
- **WHEN** o pedido está pago e ao menos um item ainda não teve a entrega
  confirmada
- **THEN** a ação de solicitar repasse não é oferecida e uma tentativa direta é
  rejeitada, com a mesma regra do gatilho automático de entrega

#### Scenario: Pedido migrado do Bubble sem registro de entrega
- **WHEN** o pedido tem a marcação legada de item entregue mas não tem linha na
  tabela de entregas
- **THEN** ele é tratado como entregue para efeito da solicitação

#### Scenario: Pedido de outra loja
- **WHEN** a solicitação é tentada para um pedido que não pertence à loja do
  seller autenticado
- **THEN** o sistema rejeita a solicitação com erro explícito

#### Scenario: Repasse já transferido
- **WHEN** o repasse de destino `seller` daquele pedido já está transferido
- **THEN** a interface exibe o estado de transferência já realizada em vez da
  ação, e uma nova solicitação não gera segunda transferência

#### Scenario: Pedido com afiliado
- **WHEN** o pedido tem comissão de afiliado pendente no ledger e o seller
  aciona a solicitação
- **THEN** a comissão do afiliado também é submetida na mesma execução, porque
  a solicitação reutiliza o mesmo processamento do gatilho automático, no qual
  as duas comissões já vencem juntas na confirmação de entrega

#### Scenario: Chave PIX inelegível
- **WHEN** a loja não tem chave PIX habilitada para repasse no momento da
  solicitação
- **THEN** a linha do ledger fica em estado inelegível para tratamento humano no
  painel administrativo, sem perder a solicitação e sem transferir valor

### Requirement: Valor do repasse ao seller independe de coluna legada
O sistema SHALL calcular o valor do repasse de destino `seller` a partir das
colunas gravadas pelo checkout, usando por linha de item o valor da linha menos
a comissão da plataforma e menos a comissão do afiliado. O valor legado
importado do Bubble, quando presente na linha, SHALL ter precedência, para não
reescrever o histórico de pedidos migrados.

#### Scenario: Pedido criado pelo checkout atual
- **WHEN** o ledger é recalculado para um pedido cujas linhas não têm o valor
  legado gravado
- **THEN** o repasse de seller é criado com o valor derivado das colunas do
  checkout, e não com zero

#### Scenario: Pedido importado do Bubble
- **WHEN** o ledger é recalculado para um pedido cujas linhas têm o valor legado
  gravado
- **THEN** o repasse de seller usa o valor legado

## MODIFIED Requirements

### Requirement: Listagem de pedidos da loja
O sistema SHALL listar os pedidos da loja do seller exibindo, por pedido,
identificador da venda, cliente, data de pagamento, quantidade de itens,
contagem de itens transferidos e entregues, valor do pedido e o status
combinado com a forma de pagamento. A lista SHALL oferecer os filtros "Todos",
"Concluido e pago", "Pago e Entregue", "Pago e não entregue", "Aguardando
pagamento" e "Ainda no Carrinho".

#### Scenario: Pedido pago sem data de pagamento registrada
- **WHEN** um pedido está pago mas não tem data de pagamento gravada
- **THEN** a coluna de data de pagamento é exibida vazia, sem quebrar a linha

#### Scenario: Filtro "Pago e não entregue"
- **WHEN** o filtro "Pago e não entregue" está ativo
- **THEN** são listados apenas pedidos com pagamento confirmado que ainda têm ao
  menos um item não entregue

#### Scenario: Forma de pagamento ausente
- **WHEN** o pedido não tem forma de pagamento definida
- **THEN** apenas o status é exibido, sem sufixo

### Requirement: Detalhe dos itens do pedido
O sistema SHALL exibir, para cada item do pedido, produto, quantidade, valor,
comissão da plataforma, situação de entrega com data e hora quando entregue,
vínculo com venda futura, situação de transferência e os dados de entrega do
item (endereço e contato do cliente).

#### Scenario: Item entregue
- **WHEN** o item tem data de entrega registrada
- **THEN** a situação de entrega mostra a data e a hora da entrega

#### Scenario: Item para retirada na loja
- **WHEN** o item é de retirada na loja e portanto não tem endereço de entrega
- **THEN** os dados de entrega indicam retirada na loja em vez de endereço
