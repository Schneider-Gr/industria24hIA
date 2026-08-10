# Seller Corridas (Chamar Motorista) Specification

## Purpose

Permite publicar uma corrida de entrega avulsa (com ou sem pedido vinculado),
receber e escolher lances de parceiros logísticos, e acompanhar o ciclo até a
entrega — incluindo o despacho automático de corridas para pedidos pagos que
exigem entrega.

> **Nota de escopo:** esta tela vive em `/corridas`, fora do agrupamento de rotas
> do seller, e está disponível a qualquer usuário autenticado (não exclusiva a
> quem tem loja) — documentada aqui porque é o item "Corridas (chamar motorista)"
> do menu do seller e é o mecanismo real de despacho de entregas dos pedidos da
> loja hoje.

## Requirements

### Requirement: Publicar corrida
O sistema SHALL permitir que um usuário autenticado publique uma corrida
informando peso, janela de tempo, urgência e modo de contratação (primeiro que
aceita ou leilão), calculando um preço sugerido por faixa de CEP quando disponível.

#### Scenario: Janela de tempo inválida
- **WHEN** o fim da janela de tempo não é posterior ao início
- **THEN** a publicação é rejeitada

#### Scenario: Corrida vinculada a um pedido de outra loja
- **WHEN** a corrida é publicada com um pedido vinculado que não pertence ao
  usuário nem à loja do usuário
- **THEN** a publicação é rejeitada

#### Scenario: Sem faixa de frete cadastrada para o trajeto
- **WHEN** não existe faixa de preço cadastrada para o CEP de origem/destino
- **THEN** o preço sugerido não é calculado, sem impedir a publicação

### Requirement: Despacho automático de corrida para pedido pago
O sistema SHALL despachar automaticamente uma corrida quando um pedido é pago e
tem ao menos um item que não é retirada na loja e tem CEP de entrega definido —
sem duplicar corrida para o mesmo pedido.

#### Scenario: Pedido só com retirada na loja
- **WHEN** todos os itens do pedido pago são de retirada na loja
- **THEN** nenhuma corrida é despachada automaticamente

#### Scenario: Despacho repetido para o mesmo pedido
- **WHEN** o despacho automático é acionado mais de uma vez para o mesmo pedido
- **THEN** a corrida já existente é reaproveitada, sem criar uma segunda

#### Scenario: Exclusividade temporária para afiliado logístico aprovado
- **WHEN** existe um afiliado logístico aprovado mais antigo para a loja do
  pedido
- **THEN** esse afiliado recebe uma janela de exclusividade antes da corrida
  entrar no pool geral de parceiros

### Requirement: Escolher lance e cancelar corrida
O sistema SHALL permitir que apenas o solicitante da corrida escolha um lance
recebido (corrida no status "Publicada") ou cancele a corrida enquanto ela ainda
está "Publicada" ou "Aceita".

#### Scenario: Cancelamento de corrida em andamento
- **WHEN** a corrida já está com status "Coletada" ou em trânsito
- **THEN** o cancelamento é rejeitado

### Requirement: Avaliação após entrega
O sistema SHALL permitir que o solicitante avalie a corrida somente após o status
chegar a "Entregue" e apenas uma vez por corrida.

#### Scenario: Corrida ainda não entregue
- **WHEN** a corrida não está com status "Entregue"
- **THEN** o formulário de avaliação não é exibido

#### Scenario: Corrida já avaliada
- **WHEN** o solicitante já avaliou a corrida
- **THEN** o formulário de avaliação não é exibido novamente

### Requirement: Confirmação de entrega exige foto
O sistema SHALL exigir uma foto de comprovação para que a transição de status de
uma corrida chegue a "Entregue".

#### Scenario: Tentativa de marcar entregue sem foto
- **WHEN** a transição de status para "Entregue" não inclui uma foto de entrega
- **THEN** a transição é rejeitada
