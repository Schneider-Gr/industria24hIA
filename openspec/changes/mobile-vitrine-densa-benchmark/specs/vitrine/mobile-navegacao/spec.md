## Purpose

Encurtar o caminho do comprador mobile até categoria, cupom, recompra e código de entrega, os atalhos que a dona apontou no benchmark do Zé Delivery.

## ADDED Requirements

### Requirement: Chips fixos de categoria na home mobile
A home mobile SHALL exibir, logo abaixo do header e fixa durante a rolagem, uma faixa horizontal de chips em pílula cujo primeiro chip é "Categorias" e os seguintes são categorias com ao menos um produto disponível para o CEP do comprador.

#### Scenario: Rolar a home
- **WHEN** o comprador rola a home para baixo
- **THEN** a faixa de chips permanece visível no topo, abaixo do header

#### Scenario: Categoria sem produto no CEP
- **WHEN** uma categoria não tem nenhum produto disponível para o CEP informado
- **THEN** ela não aparece como chip

### Requirement: Bottom sheet de categorias
Tocar no chip "Categorias" SHALL abrir um painel inferior (bottom sheet) com as categorias em grade de duas colunas, cada uma com nome e imagem, fechável por botão, por toque fora e pela tecla Escape.

#### Scenario: Abrir e escolher
- **WHEN** o comprador toca "Categorias" e depois toca "Material de construção"
- **THEN** o painel fecha e abre a listagem de Material de construção

#### Scenario: Painel acima da tab bar e do botão de atendimento
- **WHEN** o painel está aberto
- **THEN** ele cobre a tab bar e o botão flutuante de atendimento, sem ficar atrás deles

### Requirement: Comprar de novo
O histórico de pedidos do comprador SHALL oferecer "Comprar de novo" em cada pedido concluído, que adiciona ao carrinho os itens ainda disponíveis, nas mesmas quantidades, e informa quais itens não puderam ser adicionados.

#### Scenario: Todos os itens disponíveis
- **WHEN** o comprador toca "Comprar de novo" num pedido cujos itens seguem aprovados, com estoque e disponíveis para o CEP atual
- **THEN** todos os itens entram no carrinho e o comprador vai para o carrinho

#### Scenario: Item indisponível
- **WHEN** um dos itens está sem estoque ou fora da faixa de CEP atual
- **THEN** os demais entram no carrinho e o comprador vê um aviso nomeando o item que ficou de fora

#### Scenario: Carrinho com outra loja
- **WHEN** o carrinho já tem itens de outra loja
- **THEN** o comprador vê o mesmo aviso de conflito de loja que o carrinho já exibe hoje, com a opção de esvaziar e continuar

### Requirement: Código de entrega à vista
A área da conta e a aba Pedidos SHALL exibir no topo o código de entrega (`pedidos.codigo_retirada`) de cada pedido pago e ainda não entregue, com o nome da loja, usando a mesma regra de visibilidade da página do pedido (só após pagamento aprovado).

#### Scenario: Um pedido pago a caminho
- **WHEN** o comprador tem um pedido pago ainda não entregue
- **THEN** o topo da conta mostra "Seu código de entrega" com os dígitos do pedido e o nome da loja

#### Scenario: Pedido aguardando pagamento
- **WHEN** o único pedido em aberto ainda não foi pago
- **THEN** nenhum código aparece

### Requirement: Tab bar mobile de cinco abas
**[DECISÃO DO DONO PENDENTE]** A tab bar mobile SHALL exibir Início, Buscar, Cupons, Carrinho e Pedidos, nessa ordem, com o badge de quantidade no Carrinho.

#### Scenario: Categorias fora da tab bar
- **WHEN** a tab bar de cinco abas está ativa
- **THEN** o acesso a categorias acontece pelo chip fixo "Categorias" da home e pelo menu

### Requirement: Economia com cupons
**[DEPENDE DE SCHEMA A CONFIRMAR]** A página `/cupons` SHALL exibir no topo o total economizado pelo comprador com cupons nos últimos 12 meses, somado a partir dos usos de cupom do próprio comprador.

#### Scenario: Comprador sem uso de cupom
- **WHEN** o comprador nunca usou cupom
- **THEN** o bloco de economia não aparece
