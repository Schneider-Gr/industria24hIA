## Purpose

Encurtar o caminho do comprador mobile até categoria, busca, cupom, recompra e código de entrega, e devolver altura de tela aos produtos, seguindo o benchmark do Zé Delivery apontado pela dona.

## ADDED Requirements

### Requirement: Topo mobile compacto
No mobile, a primeira linha do topo SHALL ter 48px com a marca da logo (o carrinho, sem o texto), o CEP como "Cidade, UF", a conta e o menu; a busca SHALL ter 36px de altura com fonte de 16px.

#### Scenario: Comprador com CEP de Manaus
- **WHEN** o comprador com CEP de Manaus abre a home num celular de 360px
- **THEN** a primeira linha mostra o ícone da marca, "Manaus, AM", a conta e o menu, sem quebrar linha

### Requirement: Busca e chips recolhem ao rolar
No mobile, a busca e os chips de categoria SHALL sair do topo quando o comprador rola para baixo e voltar em qualquer rolagem para cima; a primeira linha do topo e a tab bar SHALL permanecer.

#### Scenario: Rolar para baixo e para cima
- **WHEN** o comprador rola a home para baixo além de 64px e depois rola para cima
- **THEN** busca e chips somem na descida e voltam na subida

#### Scenario: Digitando na busca
- **WHEN** o campo de busca tem foco e a página rola
- **THEN** a busca continua visível

#### Scenario: Modal aberto
- **WHEN** o modal de CEP ou o painel de categorias está aberto
- **THEN** o topo não recolhe

#### Scenario: Movimento reduzido
- **WHEN** o sistema do comprador pede movimento reduzido
- **THEN** o topo aparece e some sem animação

### Requirement: Chips de categoria na home mobile
A home mobile SHALL exibir no topo uma faixa horizontal de chips em pílula cujo primeiro chip é "Categorias" e os seguintes são categorias com ao menos um produto visível na home para o CEP do comprador.

#### Scenario: Categoria sem produto no CEP
- **WHEN** uma categoria não tem nenhum produto visível na home para o CEP informado
- **THEN** ela não aparece como chip

#### Scenario: Comprador sem CEP
- **WHEN** o comprador ainda não informou o CEP
- **THEN** a home não lista produto e não exibe chips

### Requirement: Bottom sheet de categorias
Tocar no chip "Categorias" SHALL abrir um painel inferior com as categorias em grade de duas colunas, cada uma com nome e ícone, fechável por botão, por toque fora e pela tecla Escape, devolvendo o foco ao chip ao fechar.

#### Scenario: Abrir e escolher
- **WHEN** o comprador toca "Categorias" e depois toca "Material de construção"
- **THEN** o painel fecha e abre a listagem de Material de construção

#### Scenario: Painel acima da tab bar e do atendimento
- **WHEN** o painel está aberto
- **THEN** ele cobre a tab bar e o botão flutuante de atendimento

### Requirement: Tab bar mobile de cinco abas
A tab bar mobile SHALL exibir Início, Buscar, Cupons, Carrinho e Pedidos, nessa ordem, com o badge de quantidade no Carrinho e a aba da página atual marcada.

#### Scenario: Categorias fora da tab bar
- **WHEN** o comprador quer navegar por categoria
- **THEN** ele usa o chip "Categorias" da home ou o menu

### Requirement: Cronômetro de ofertas só com validade real
A home SHALL exibir o cronômetro de ofertas apenas quando alguma faixa de desconto ativa tem data de validade, contando até o fim do dia da validade mais próxima.

#### Scenario: Nenhuma faixa com validade
- **WHEN** as ofertas visíveis não têm validade cadastrada
- **THEN** nenhum cronômetro aparece

#### Scenario: Faixa vence em 15/09
- **WHEN** a faixa com validade mais próxima vale até 15/09
- **THEN** o cronômetro conta até 15/09 às 23:59:59 e some depois disso

### Requirement: Comprar de novo
O histórico de pedidos SHALL oferecer "Comprar de novo" em cada pedido que não esteja aguardando pagamento, adicionando ao carrinho, com o preço de hoje, os itens ainda disponíveis e informando quais não puderam ser adicionados.

#### Scenario: Todos os itens disponíveis
- **WHEN** o comprador toca "Comprar de novo" num pedido cujos itens seguem aprovados, com estoque e dentro da faixa do CEP atual
- **THEN** todos os itens entram no carrinho e o comprador vai para o carrinho

#### Scenario: Item indisponível
- **WHEN** um dos itens está sem estoque, fora da faixa de CEP atual ou era reserva de Venda Futura
- **THEN** os demais entram no carrinho e o comprador vê um aviso nomeando o item que ficou de fora

### Requirement: Código de entrega à vista
O topo de `/meus-pedidos` (a aba Pedidos) SHALL exibir o código de entrega (`pedidos.codigo_retirada`) de cada pedido pago com algum item ainda não entregue, identificado pelo número do pedido, e o menu de conta SHALL ter o atalho "Código de entrega" para esse cartão.

#### Scenario: Um pedido pago a caminho
- **WHEN** o comprador tem um pedido com pagamento realizado e item ainda não entregue
- **THEN** o topo da aba Pedidos mostra "Seu código de entrega" com os dígitos e o número do pedido

#### Scenario: Pedido já entregue ou aguardando pagamento
- **WHEN** todos os itens do pedido foram entregues, ou o pedido ainda aguarda pagamento
- **THEN** o código desse pedido não aparece no cartão
