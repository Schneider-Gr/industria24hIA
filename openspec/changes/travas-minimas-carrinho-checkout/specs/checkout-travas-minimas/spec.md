## Purpose

Torna visíveis, no carrinho, as duas travas de compra mínima que o marketplace
já aplica no servidor — quantidade mínima por produto e ticket mínimo por loja —
bloqueando o fechamento apenas da loja que não atende à regra, explicando o que
falta e oferecendo caminho para desbloquear, sem nunca deixar o comprador
descobrir a trava só depois de preencher o checkout.

## ADDED Requirements

### Requirement: Convivência das duas travas de mínimo
O sistema SHALL avaliar, para cada loja presente no carrinho, duas condições
independentes: (a) todo item do grupo atende à `quantidade_minima` do seu
produto, quando definida, e (b) o subtotal dos itens daquele grupo — já com
desconto progressivo aplicado e sem frete — é maior ou igual ao
`valor_pedido_minimo` da loja, quando definido. O grupo SHALL ser considerado
apto ao fechamento somente quando ambas forem verdadeiras. Nenhuma das duas
condições SHALL substituir ou dispensar a outra.

#### Scenario: Itens acima da quantidade mínima, loja abaixo do ticket
- **WHEN** todos os itens de uma loja atendem à quantidade mínima, mas o
  subtotal do grupo é menor que o ticket mínimo daquela loja
- **THEN** o grupo é bloqueado pelo ticket mínimo

#### Scenario: Subtotal acima do ticket, item abaixo da quantidade mínima
- **WHEN** o subtotal do grupo supera o ticket mínimo da loja, mas um dos itens
  está abaixo da quantidade mínima do produto
- **THEN** o grupo é bloqueado pela quantidade mínima, e o item em falta é
  identificado

#### Scenario: Loja sem nenhum mínimo configurado
- **WHEN** a loja não define `valor_pedido_minimo` e nenhum de seus produtos no
  carrinho define `quantidade_minima`
- **THEN** o grupo está apto ao fechamento

### Requirement: Bloqueio visível por grupo de loja
Quando um grupo de loja não está apto, o sistema SHALL exibir, no carrinho, um
painel de bloqueio sobre aquele grupo contendo: destaque visual de erro no
contorno do grupo, o aviso `"[Nome da loja] – compra mínima R$ X"` no topo dos
itens daquela loja quando a trava violada for o ticket mínimo, a indicação do
item e da quantidade exigida quando a trava violada for a quantidade mínima, e
um controle desabilitado com o texto `"Adicione mais itens ao seu carrinho!"` no
lugar do acionador de fechamento daquele grupo. Ambas as travas SHALL usar o
mesmo painel, não avisos concorrentes.

#### Scenario: Comprador abre o carrinho abaixo do ticket
- **WHEN** o carrinho contém uma loja cujo subtotal está abaixo do ticket mínimo
- **THEN** o grupo daquela loja aparece com o aviso em destaque de erro no topo
  e o acionador de fechamento substituído pelo controle desabilitado

#### Scenario: Comprador atinge o mínimo ajustando a quantidade
- **WHEN** o comprador aumenta a quantidade de um item e o subtotal do grupo
  passa a atingir o ticket mínimo
- **THEN** o painel de bloqueio desaparece e o fechamento daquele grupo é
  liberado, sem recarregar a página

#### Scenario: Quantidade mínima alterada depois da adição ao carrinho
- **WHEN** o comprador tem em carrinho um item adicionado antes de o seller
  elevar a `quantidade_minima` do produto, e a quantidade em carrinho ficou
  abaixo do novo mínimo
- **THEN** o grupo é bloqueado e o item é apontado com a quantidade exigida

### Requirement: Fechamento parcial por loja
O sistema SHALL permitir que o comprador finalize a compra das lojas aptas
mesmo quando outra loja do mesmo carrinho está bloqueada. Os itens da loja
bloqueada SHALL permanecer no carrinho após o fechamento das demais, e o
bloqueio de uma loja NÃO SHALL impedir o fechamento das outras.

#### Scenario: Carrinho com três lojas, uma bloqueada
- **WHEN** o carrinho tem três lojas e apenas uma está abaixo do ticket mínimo
- **THEN** o comprador consegue fechar o pedido das duas lojas aptas

#### Scenario: Itens retidos após fechamento parcial
- **WHEN** o comprador fecha o pedido das lojas aptas
- **THEN** os itens da loja bloqueada continuam no carrinho, com o painel de
  bloqueio preservado

#### Scenario: Todas as lojas bloqueadas
- **WHEN** todas as lojas do carrinho estão bloqueadas
- **THEN** nenhum acionador de fechamento fica habilitado

### Requirement: Sugestões de desbloqueio da loja bloqueada
Dentro do painel do grupo bloqueado por ticket mínimo, o sistema SHALL oferecer
sugestões de produtos **exclusivamente da loja bloqueada**, ordenadas pela
proximidade ao valor que falta para atingir o ticket, priorizando produtos cujo
valor esteja entre 60% e 130% desse valor faltante. Produtos de outras lojas NÃO
SHALL aparecer nessas sugestões.

#### Scenario: Faltam R$ 3.200 para o ticket
- **WHEN** o grupo bloqueado precisa de mais R$ 3.200 para atingir o ticket
- **THEN** as sugestões exibidas são produtos da mesma loja, priorizando os de
  valor entre R$ 1.920 e R$ 4.160

#### Scenario: Loja sem produto na faixa do gap
- **WHEN** a loja bloqueada não tem produto na faixa de 60% a 130% do valor
  faltante
- **THEN** as sugestões restantes da mesma loja são exibidas ordenadas pela
  menor distância ao valor faltante

#### Scenario: Bloqueio por quantidade mínima
- **WHEN** o grupo está bloqueado apenas por quantidade mínima de um item
- **THEN** a sugestão apresentada é o ajuste da quantidade daquele item, não
  produtos adicionais

### Requirement: Cupom não pode violar o ticket mínimo
O sistema SHALL recusar a aplicação de um cupom cujo desconto levaria o subtotal
da loja abaixo do `valor_pedido_minimo` daquela loja. O pedido NÃO SHALL ser
bloqueado por esse motivo: o cupom é descartado e o pedido segue pelo valor sem
o cupom. O comprador SHALL receber a razão explícita da recusa, nomeando o
cupom e o valor da compra mínima da loja.

#### Scenario: Cupom derrubaria abaixo do mínimo
- **WHEN** o subtotal da loja supera o ticket mínimo, mas ficaria abaixo dele
  após o desconto do cupom informado
- **THEN** o cupom é recusado, o pedido pode ser fechado pelo valor sem
  desconto, e o comprador vê a razão da recusa mencionando o cupom e o valor da
  compra mínima

#### Scenario: Cupom mantém o subtotal acima do mínimo
- **WHEN** o subtotal com o desconto do cupom continua maior ou igual ao ticket
  mínimo
- **THEN** o cupom é aplicado normalmente

#### Scenario: Recusa é decidida no servidor
- **WHEN** um cliente submete o pedido com um cupom que violaria o ticket mínimo
- **THEN** o servidor recusa o cupom independentemente do que o cliente
  informou, e grava o pedido sem o desconto

### Requirement: Mensagem legível quando a trava chega ao checkout
Quando a criação do pedido é recusada por quantidade mínima ou por ticket
mínimo, o sistema SHALL apresentar ao comprador uma mensagem que nomeie a loja
ou o produto e o valor ou a quantidade exigida, e NÃO SHALL expor o texto bruto
da exceção do banco.

#### Scenario: Carrinho alterado em outra aba
- **WHEN** o comprador chega ao checkout com um grupo que passou a violar um
  mínimo depois de o carrinho ter sido carregado
- **THEN** a submissão é recusada com mensagem que nomeia a loja ou o produto e
  o mínimo exigido, e o comprador é levado de volta ao carrinho com o painel de
  bloqueio visível
