## Purpose

Define como o marketplace resolve os pedidos herdados da migração do Bubble que
chegaram sem linha de item, separando o que pode ser cancelado do que envolve
dinheiro efetivamente recebido, e impede que pedido sem item volte a existir.

## ADDED Requirements

### Requirement: Consulta ao provedor de pagamento antes de qualquer escrita
O sistema SHALL determinar o destino de um pedido herdado sem itens a partir do
status real da cobrança no provedor de pagamento, e NÃO SHALL inferir esse
destino a partir do `status_pedido` gravado localmente. A consulta SHALL usar a
credencial do ambiente que emitiu a cobrança, identificado pelo domínio do
`link_cobranca`. Nenhuma linha de `pedidos` SHALL ser alterada antes de o
levantamento completo estar registrado.

#### Scenario: Cobrança emitida em ambiente diferente do configurado
- **WHEN** o `link_cobranca` aponta para o ambiente de produção e a credencial
  configurada é de sandbox
- **THEN** o processo para e reporta a credencial que falta, sem alterar pedido
  algum

#### Scenario: Levantamento incompleto
- **WHEN** a consulta de qualquer cobrança falha por erro de rede ou permissão
- **THEN** nenhum pedido é alterado naquela execução, e os pedidos consultados
  com sucesso são registrados para a próxima tentativa

### Requirement: Três destinos para o pedido herdado sem itens
O sistema SHALL classificar cada pedido herdado sem itens em exatamente um
destino: cancelamento por migração incompleta, reconciliação manual, ou
cancelamento como registro vazio. Pedido cuja cobrança conste como paga no
provedor NÃO SHALL ser cancelado automaticamente.

#### Scenario: Cobrança pendente ou vencida no provedor
- **WHEN** a cobrança existe e está pendente, vencida ou aguardando análise
- **THEN** o pedido é cancelado com motivo de migração incompleta

#### Scenario: Cobrança paga no provedor
- **WHEN** a cobrança consta como recebida, confirmada ou estornada
- **THEN** o pedido NÃO é cancelado, é marcado para reconciliação manual e
  reportado à operação com valor e identificador da cobrança

#### Scenario: Pedido sem cliente, sem valor e sem cobrança
- **WHEN** o pedido não tem cliente, não tem valor e não tem cobrança associada
- **THEN** o pedido é cancelado como registro vazio, sem aviso a comprador

#### Scenario: Pedido já marcado como pago localmente e sem itens
- **WHEN** o `status_pedido` é de pagamento realizado e não há nenhuma linha de
  item
- **THEN** o pedido é tratado como reconciliação manual, independentemente do que
  o provedor responda, porque existe receita registrada sem contrapartida
  conhecida

### Requirement: Rastro auditável da decisão
O sistema SHALL registrar, para cada pedido tratado, o destino escolhido, o
status devolvido pelo provedor, o valor e o instante da decisão, em
`auditoria_eventos`. O registro SHALL ser gravado ainda que o destino seja não
fazer nada.

#### Scenario: Cancelamento executado
- **WHEN** um pedido herdado é cancelado por este processo
- **THEN** existe um evento de auditoria que permite reconstruir por que ele foi
  cancelado, sem depender da memória de quem executou

### Requirement: Aviso ao comprador do pedido cancelado
O sistema SHALL avisar por e-mail o comprador de todo pedido herdado que for
cancelado e que tenha cliente com e-mail conhecido, explicando que o pedido veio
de uma migração incompleta e que nada foi cobrado. Falha de envio NÃO SHALL
reverter o cancelamento.

#### Scenario: Pedido cancelado sem cliente identificado
- **WHEN** o pedido cancelado não tem cliente ou o cliente não tem e-mail
- **THEN** o cancelamento acontece e a ausência de aviso é registrada no
  resultado da execução

### Requirement: Pedido sem item deixa de ser possível
O sistema SHALL recusar a existência de pedido sem nenhuma linha de item fora do
instante da criação, de modo que nenhuma importação ou rotina futura recrie o
estado que originou esta change.

#### Scenario: Importação tenta criar pedido sem item
- **WHEN** uma rotina insere um pedido e não insere nenhuma linha de item para ele
- **THEN** a operação é recusada com mensagem que nomeia a regra violada

#### Scenario: Remoção do último item de um pedido existente
- **WHEN** a última linha de item de um pedido é removida
- **THEN** a operação é recusada, e a forma de encerrar o pedido é cancelá-lo
