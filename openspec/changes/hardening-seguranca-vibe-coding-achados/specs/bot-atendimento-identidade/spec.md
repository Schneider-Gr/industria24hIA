## Purpose

Definir sob qual condição o bot de atendimento via WhatsApp pode expor dado de pedido a quem
está conversando, dado que o número de WhatsApp remetente não é, por si só, prova de identidade.

## ADDED Requirements

### Requirement: Consulta de pedido no WhatsApp exige telefone de contato correspondente
O sistema SHALL retornar dados de um pedido pelo canal WhatsApp somente quando o telefone
normalizado do remetente da mensagem corresponder ao `telefone_contato` gravado nesse pedido. O
sistema SHALL NOT considerar suficiente, isoladamente, o e-mail informado em texto livre pelo
remetente para liberar acesso a `codigo_retirada`, `valor_pedido`, `status_pedido` ou a listagem
de pedidos de uma conta.

#### Scenario: Remetente identificado por e-mail mas telefone não corresponde ao pedido
- **WHEN** uma conversa de WhatsApp foi identificada com uma conta (via e-mail) e o usuário pede
  o status de um pedido cujo `telefone_contato` é diferente do telefone da conversa
- **THEN** o bot responde que não encontrou o pedido, sem expor nenhum dado dele

#### Scenario: Remetente identificado com telefone correspondente ao pedido
- **WHEN** uma conversa de WhatsApp foi identificada com uma conta e o usuário pede o status de
  um pedido cujo `telefone_contato` bate com o telefone normalizado da conversa
- **THEN** o bot retorna os dados do pedido normalmente

#### Scenario: Pedido sem telefone de contato cadastrado
- **WHEN** o pedido consultado não tem `telefone_contato` preenchido
- **THEN** o bot não retorna esse pedido pelo canal WhatsApp

#### Scenario: Listagem de pedidos no WhatsApp
- **WHEN** o usuário identificado pede a lista de seus pedidos pelo WhatsApp
- **THEN** a lista inclui somente pedidos cujo `telefone_contato` corresponde ao telefone da
  conversa
