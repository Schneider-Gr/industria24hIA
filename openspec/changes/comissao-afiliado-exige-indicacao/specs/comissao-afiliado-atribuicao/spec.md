## Purpose

Define quem recebe comissão de afiliado quando um pedido é criado, e sob qual condição. Comissão de afiliado é remuneração por indicação: existe quando um link de divulgação trouxe o comprador, e não existe quando ninguém trouxe.

## ADDED Requirements

### Requirement: Comissão de afiliado exige link de divulgação
O sistema SHALL creditar comissão de afiliado em um item de pedido somente quando a compra tiver sido originada por um link de divulgação (`?ref=`) cujo identificador corresponda a uma afiliação com status `Aprovada` válida para o produto ou para a loja do item. Na ausência de link válido, o item SHALL registrar `afiliado_id` nulo e `repasse_afiliado` igual a zero.

#### Scenario: Compra orgânica, sem link de afiliado
- **WHEN** um comprador cria um pedido de um produto de uma loja que possui afiliações Aprovadas, sem ter acessado nenhum link de divulgação
- **THEN** nenhum afiliado é creditado e o repasse de afiliado do item é zero

#### Scenario: Compra por link de afiliado válido
- **WHEN** um comprador cria um pedido tendo acessado o link de divulgação de uma afiliação Aprovada que cobre o produto ou a loja do item
- **THEN** o afiliado dessa afiliação é creditado no item, com repasse calculado pela porcentagem da própria afiliação

#### Scenario: Link com identificador inexistente ou de afiliação não aprovada
- **WHEN** um comprador cria um pedido tendo acessado um link cujo identificador não corresponde a nenhuma afiliação Aprovada válida para o produto ou loja do item
- **THEN** nenhum afiliado é creditado e o repasse de afiliado do item é zero, sem erro para o comprador

#### Scenario: Link de afiliado de outra loja
- **WHEN** o link de divulgação acessado pertence a uma afiliação de uma loja diferente da loja do item comprado
- **THEN** esse afiliado não é creditado no item, e o repasse de afiliado do item é zero

### Requirement: Pedido multiloja atribui comissão por item
O sistema SHALL avaliar a atribuição de comissão item a item. Num pedido que abranja produtos de lojas distintas, o link de divulgação SHALL creditar apenas os itens cobertos pela afiliação correspondente.

#### Scenario: Carrinho com itens de duas lojas e link de uma delas
- **WHEN** o pedido contém itens da loja A e da loja B, e o link de divulgação acessado é de uma afiliação Aprovada da loja A
- **THEN** os itens da loja A creditam comissão ao afiliado, e os itens da loja B ficam com repasse de afiliado zero

### Requirement: Comissão da plataforma independe de afiliação
O sistema SHALL manter o repasse da plataforma (`repasse_ind`) inalterado pela presença ou ausência de afiliado no item.

#### Scenario: Item sem afiliado creditado
- **WHEN** um item de pedido não credita comissão a nenhum afiliado
- **THEN** o repasse da plataforma sobre esse item permanece o mesmo que seria com afiliado creditado
