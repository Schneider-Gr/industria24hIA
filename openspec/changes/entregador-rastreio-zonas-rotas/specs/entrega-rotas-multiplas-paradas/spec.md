# Rota com várias entregas

## ADDED Requirements

### Requirement: Sugestão automática de lote

O sistema SHALL sugerir ao admin lotes de entrega formados por pedidos pagos
com frete consolidado da mesma loja e com destino na mesma zona.

#### Scenario: Pedidos elegíveis na janela

- **WHEN** existem dois ou mais pedidos pagos com frete consolidado, da mesma
  loja e com destino na mesma zona, dentro da janela configurada
- **THEN** o admin vê a sugestão de lote com os pedidos e a rota proposta

#### Scenario: Pedidos de lojas diferentes

- **WHEN** os pedidos são de lojas diferentes
- **THEN** não entram no mesmo lote

#### Scenario: Admin aprova a sugestão

- **WHEN** o admin aprova o lote sugerido
- **THEN** o lote vira uma corrida única no motor de corridas existente, com a
  mesma regra de aceite, exclusividade e repasse da consolidação atual

### Requirement: Ordem otimizada das paradas

O sistema SHALL calcular e gravar a ordem das paradas do lote e a estimativa de
chegada de cada uma.

#### Scenario: Lote aprovado

- **WHEN** o lote é aprovado
- **THEN** as paradas recebem ordem e estimativa de chegada calculadas a partir
  do endereço de coleta da loja

#### Scenario: Serviço de rotas indisponível

- **WHEN** a otimização de rota falha
- **THEN** o lote é criado com a ordem de chegada dos pedidos e o admin vê o
  aviso de que a rota não foi otimizada

#### Scenario: Lote acima do limite de paradas

- **WHEN** o lote passa do limite de paradas suportado pela otimização
- **THEN** a sugestão é dividida em lotes menores

### Requirement: Cada parada fecha com o código do seu comprador

O sistema SHALL confirmar cada parada do lote com o código do respectivo
comprador e concluir a corrida somente quando todas as paradas estiverem
resolvidas.

#### Scenario: Parada confirmada

- **WHEN** o entregador informa o código correto do comprador da parada
- **THEN** aquele pedido é confirmado como entregue, o repasse dele segue o
  fluxo existente e a próxima parada passa a ser a atual

#### Scenario: Comprador ausente

- **WHEN** o entregador marca a parada como falha de entrega
- **THEN** a parada sai da rota, o pedido volta para tratamento do seller e as
  demais paradas continuam

#### Scenario: Última parada resolvida

- **WHEN** todas as paradas foram confirmadas ou marcadas como falha
- **THEN** a corrida do lote passa para `Entregue`

### Requirement: Comprador vê sua posição na rota

O sistema SHALL informar ao comprador de um pedido em lote quantas entregas
faltam antes da dele e a estimativa de chegada da sua parada.

#### Scenario: Comprador na terceira parada

- **WHEN** o comprador abre o pedido e há duas paradas antes da dele ainda não
  resolvidas
- **THEN** vê "faltam 2 entregas antes da sua" junto do mapa e da estimativa

#### Scenario: Posições de outros compradores

- **WHEN** o comprador visualiza a rota
- **THEN** não vê endereços nem dados dos outros compradores do lote
