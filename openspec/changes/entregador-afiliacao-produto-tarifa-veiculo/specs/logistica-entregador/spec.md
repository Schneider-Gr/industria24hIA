# Logística: entregador, afiliação por produto e tarifa por veículo

## ADDED Requirements

### Requirement: Cadastro livre do entregador

O sistema SHALL ativar o cadastro do entregador ao salvar, sem aprovação do
admin, e SHALL NOT liberar corrida sem afiliação aprovada a produto.

#### Scenario: Entregador novo sem afiliação

- **WHEN** um entregador salva o cadastro e não tem nenhuma afiliação aprovada
- **THEN** o cadastro fica ativo e nenhuma corrida aparece para ele

#### Scenario: Entregador suspenso

- **WHEN** o admin suspende um entregador
- **THEN** ele não vê nem aceita corridas, mesmo com afiliações aprovadas

### Requirement: Afiliação por produto aprovada pelo seller

O sistema SHALL registrar pedidos de afiliação por produto e SHALL liberar
corridas de um produto só a entregadores que o seller aprovou para ele.

#### Scenario: Seller aprova um de dois pedidos

- **WHEN** o entregador pede afiliação aos produtos A e B e o seller aprova só A
- **THEN** o entregador vê corridas com A e não vê corridas com B

#### Scenario: Revogação

- **WHEN** o seller revoga uma aprovação
- **THEN** o entregador deixa de ver novas corridas daquele produto e as corridas
  já aceitas por ele continuam

### Requirement: Preço pela classe de veículo

O sistema SHALL escolher a menor classe que aguenta o peso total do carrinho
(moto até 20 kg, carro até 300 kg, caminhão acima) e SHALL cobrar o maior valor
entre a tarifa mínima e km × R$/km da classe definida pelo seller.

#### Scenario: Carrinho leve

- **WHEN** o carrinho pesa 3 kg
- **THEN** a cotação usa a tarifa de moto da loja

#### Scenario: Entrega curta

- **WHEN** km × R$/km da classe fica abaixo da tarifa mínima
- **THEN** o preço é a tarifa mínima

#### Scenario: Classe sem tarifa ou item sem peso

- **WHEN** a classe exigida não tem tarifa definida ou algum item não tem peso
- **THEN** a opção de entrega por parceiro não aparece para aquela loja

### Requirement: Corrida para o primeiro elegível que aceitar

O sistema SHALL mostrar a corrida a todos os entregadores elegíveis ao mesmo
tempo e SHALL entregá-la ao primeiro que aceitar.

#### Scenario: Elegibilidade

- **WHEN** a corrida é criada
- **THEN** só a veem entregadores aprovados em todos os itens, com veículo da
  classe da corrida ou maior, peso suportado maior ou igual à carga, valor
  mínimo menor ou igual ao valor da corrida e não suspensos

#### Scenario: Aceite concorrente

- **WHEN** dois entregadores aceitam a mesma corrida ao mesmo tempo
- **THEN** só o primeiro fica com ela e o segundo recebe "corrida já aceita"

### Requirement: Simulador de viabilidade no avião

O sistema SHALL mostrar ao seller, para um produto e uma quantidade, a classe
exigida, o frete, o percentual do frete sobre o pedido e a quantidade a partir
da qual o frete fica em até 20% do pedido, apenas como sugestão.

#### Scenario: Pedido pequeno de produto leve

- **WHEN** o seller simula 10 maços de alface a 5 km
- **THEN** o simulador mostra classe moto, o frete, o percentual e a quantidade
  mínima sugerida, sem bloquear nada

## REMOVED Requirements

### Requirement: Exclusividade de 5 minutos do afiliado da loja

**Reason**: substituída pelo primeiro elegível que aceitar (PRD 054, decisão 4).

### Requirement: R$/km por produto e piso por loja

**Reason**: substituídos pela tarifa por classe de veículo da loja e pelo piso
por classe (PRD 054, decisões 8 e 13).
