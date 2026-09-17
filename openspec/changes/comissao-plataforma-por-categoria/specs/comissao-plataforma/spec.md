## Purpose

Substitui a comissão fixa de 5% por um percentual configurável em cada nó da
taxonomia, herdado da categoria pela subcategoria e registrado na venda, para
que a margem da plataforma reflita o custo real de operar cada tipo de produto
sem que mudanças futuras falsifiquem o extrato do passado. Esta capability cobre
a regra econômica e sua gestão; a taxonomia em si é vocabulário, e o repasse ao
seller continua sendo derivado pela spec de repasse.

## ADDED Requirements

### Requirement: Percentual de comissão por nó da taxonomia
Cada categoria e cada subcategoria SHALL ter um percentual de comissão próprio e
opcional, entre 0 e 100, com duas casas decimais. O valor ausente SHALL
significar herança, e SHALL ser distinto do valor zero, que significa comissão
nula deliberada. O sistema SHALL rejeitar percentual fora da faixa.

#### Scenario: Categoria sem percentual definido
- **WHEN** um nó é criado sem percentual
- **THEN** ele nasce em herança, e a plataforma cobra o percentual do nó acima ou
  o padrão do sistema

#### Scenario: Percentual zero
- **WHEN** a administradora salva 0% numa subcategoria
- **THEN** o valor é aceito e distinto de vazio, a plataforma não cobra comissão
  naquela subcategoria, e o seller recebe o valor integral do item

#### Scenario: Percentual fora da faixa
- **WHEN** um percentual negativo ou acima de 100 é gravado
- **THEN** a gravação é rejeitada pelo banco, e não apenas pela tela

### Requirement: Precedência da subcategoria sobre a categoria
O percentual aplicado a um item SHALL ser o da sua subcategoria quando definido,
o da sua categoria quando a subcategoria herdar, e o padrão do sistema de 5%
quando nenhum dos dois estiver definido ou quando o produto não tiver taxonomia.

#### Scenario: Subcategoria sobrescreve a categoria
- **WHEN** a categoria tem 8% e a subcategoria do produto tem 12%
- **THEN** o item é cobrado a 12%

#### Scenario: Subcategoria herda
- **WHEN** a categoria tem 8% e a subcategoria está em herança
- **THEN** o item é cobrado a 8%

#### Scenario: Produto sem taxonomia
- **WHEN** o produto não tem categoria nem subcategoria
- **THEN** o item é cobrado a 5%, que é o comportamento anterior a esta change

#### Scenario: Produto com subcategoria e sem categoria
- **WHEN** o produto tem subcategoria com percentual e a categoria está vazia
- **THEN** vale o percentual da subcategoria

### Requirement: Snapshot do percentual na venda
Toda linha de item de pedido SHALL registrar o percentual de comissão que lhe foi
aplicado, no momento do fechamento do pedido. Alterações posteriores na tabela de
percentuais SHALL NOT modificar linhas já gravadas. A exibição do percentual ao
seller e ao administrador SHALL vir do valor registrado na venda, nunca da
configuração corrente.

#### Scenario: Percentual muda depois da venda
- **WHEN** um item foi vendido a 10% e a subcategoria passa a 14% no dia seguinte
- **THEN** a linha daquele pedido continua exibindo e valendo 10%

#### Scenario: Percentual muda entre o carrinho e o fechamento
- **WHEN** o comprador monta o carrinho com a categoria a 8% e finaliza depois de
  a administradora salvar 12%
- **THEN** vale 12%, que é o percentual vigente no fechamento, quando preço e
  estoque também são revalidados no servidor

#### Scenario: Pedido anterior a esta change
- **WHEN** um pedido antigo, sem percentual registrado, é exibido
- **THEN** ele é apresentado como 5%, que é o que de fato foi cobrado

### Requirement: Recusa quando a remuneração passa do valor do item
O sistema SHALL recusar a criação do pedido quando, para qualquer item, a
comissão da plataforma somada à comissão do afiliado passar de 100% do valor do
item. A recusa SHALL ocorrer no banco, no momento do fechamento, e a mensagem
SHALL nomear os dois percentuais e o produto.

#### Scenario: Soma passa de 100%
- **WHEN** a subcategoria está a 96% e o produto tem afiliação de 5%
- **THEN** o pedido é recusado por inteiro, nada é gravado, e a mensagem nomeia
  os percentuais e o produto

#### Scenario: Soma bate exatamente 100%
- **WHEN** a comissão é 95% e o afiliado é 5%
- **THEN** o pedido é aceito e o repasse do seller é zero

### Requirement: Efeitos derivados sem regra adicional
O repasse ao seller SHALL continuar sendo derivado do valor do item menos a
comissão da plataforma menos a comissão do afiliado, e o teto do desconto de
cupom de plataforma SHALL continuar sendo a comissão daquela linha. Ambos
acompanham o percentual variável sem cálculo próprio.

#### Scenario: Comissão maior reduz o repasse
- **WHEN** a subcategoria passa de 5% para 12%
- **THEN** o repasse do seller nos pedidos seguintes cai na mesma proporção, sem
  qualquer alteração na rotina de repasse

#### Scenario: Comissão menor reduz o espaço do cupom
- **WHEN** um cupom de plataforma de R$ 5,00 incide sobre um item cuja comissão é
  de R$ 2,00
- **THEN** o desconto concedido é de R$ 2,00, limitado pela comissão da linha

#### Scenario: Pedido com itens de categorias diferentes
- **WHEN** um pedido tem um item a 4,5% e outro a 12%
- **THEN** cada linha é cobrada pelo seu percentual, sem média nem arredondamento
  no nível do pedido

### Requirement: Gestão dos percentuais no painel administrativo
A administradora SHALL poder editar o percentual de cada categoria e de cada
subcategoria de forma independente, na tela de taxonomia. A tela SHALL exibir,
por nó, o percentual efetivo e sua origem, o repasse correspondente ao seller, e
a quantidade de produtos afetados. Limpar o campo SHALL devolver a herança.
Somente perfil administrativo SHALL alterar percentuais.

#### Scenario: Herança visível
- **WHEN** uma subcategoria está sem percentual próprio e a categoria tem 8%
- **THEN** a tela mostra que ela herda 8%, em vez de exibir campo vazio ambíguo

#### Scenario: Repasse exibido como leitura
- **WHEN** a administradora digita 12% numa categoria
- **THEN** a tela mostra que o seller recebe 88%, sem tornar esse número editável

#### Scenario: Produtos afetados
- **WHEN** um nó com 49 produtos tem o percentual alterado
- **THEN** a tela mostra a quantidade de produtos daquele nó, para que a
  administradora dimensione o alcance da mudança

#### Scenario: Limpar devolve a herança
- **WHEN** a administradora apaga o percentual de uma subcategoria
- **THEN** ela volta a herdar a categoria, e não fica gravada como zero

#### Scenario: Usuário sem papel de administrador
- **WHEN** um seller ou comprador tenta alterar um percentual
- **THEN** a operação é recusada pela verificação de papel na própria ação, não
  apenas pela ausência do link na navegação

### Requirement: Percentual aplicado visível a quem recebe
O seller SHALL ver, por item vendido, o percentual de comissão que incidiu sobre
aquele item, sem depender do suporte. O administrador SHALL ver o mesmo dado.

#### Scenario: Seller confere o próprio repasse
- **WHEN** o seller abre um pedido com dois itens de categorias diferentes
- **THEN** cada item exibe o percentual que lhe foi aplicado

#### Scenario: Pedido migrado do Bubble
- **WHEN** a comissão histórica gravada não corresponde a nenhum percentual
  calculável sobre o valor
- **THEN** o valor em reais efetivamente cobrado é exibido e o percentual é
  omitido, em vez de apresentar um número derivado que não bate
