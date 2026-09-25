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

### Requirement: Preço pelo custo do parceiro

O sistema SHALL escolher a menor classe que aguenta o peso total do carrinho
(moto até 20 kg, carro até 300 kg, caminhão acima), calcular para cada parceiro
elegível o maior valor entre a tarifa mínima e km (só ida) × R$/km declarados
por ele, somar portos e ajudantes, e cobrar do consumidor a menor soma dividida
por 0,95.

#### Scenario: Carrinho leve

- **WHEN** o carrinho pesa 3 kg
- **THEN** a cotação considera só parceiros de moto ou maiores

#### Scenario: Entrega curta

- **WHEN** km × R$/km do parceiro fica abaixo da tarifa mínima dele
- **THEN** vale a tarifa mínima, somada a portos e ajudantes

#### Scenario: Dois parceiros com custos diferentes

- **WHEN** dois parceiros elegíveis somam R$ 95 e R$ 120
- **THEN** o consumidor paga R$ 100 e a corrida só aparece para quem soma até
  R$ 95

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

### Requirement: Piso por km por classe

O sistema SHALL recusar no cadastro do parceiro um R$/km abaixo do piso da
classe do veículo: moto R$ 6,00, carro R$ 8,00, caminhão R$ 20,00.

#### Scenario: Parceiro de carro abaixo do piso

- **WHEN** um parceiro de carro tenta salvar R$ 7,00/km
- **THEN** o valor não é salvo e a mensagem mostra o piso de R$ 8,00

### Requirement: Três avisos da corrida

O sistema SHALL avisar, uma vez por corrida, os entregadores elegíveis na
criação, o cliente na coleta e o seller no aceite, sem que falha de envio
trave a corrida.

#### Scenario: Corrida criada

- **WHEN** a corrida é criada após o pagamento
- **THEN** cada entregador elegível recebe um chamado para aceitar com coleta,
  destino, km, peso e o valor que vai receber

#### Scenario: Corrida aceita

- **WHEN** um entregador aceita a corrida
- **THEN** o seller recebe o nome e o telefone do entregador e o link para
  acompanhar

#### Scenario: Mercadoria coletada

- **WHEN** o entregador confirma a coleta
- **THEN** o cliente recebe o aviso de que a mercadoria saiu, com o código de
  entrega

### Requirement: Carrinho dividido por falta de entregador

O sistema SHALL separar os itens sem entregador aprovado e compatível em um
envio à parte, oferecendo para ele retirada e a combinar conforme a loja
permitir, transportadora e Uber quando atenderem, com um único pagamento.

#### Scenario: Um item afiliado e outro não

- **WHEN** o carrinho tem o produto A com entregador aprovado e o B sem
- **THEN** A é oferecido por parceiro local, B mostra as outras formas
  disponíveis e o consumidor paga tudo de uma vez

#### Scenario: Item sem peso

- **WHEN** um item não tem peso cadastrado
- **THEN** ele não vai por parceiro e entra no envio à parte

### Requirement: Mensagem para completar a afiliação na loja

O sistema SHALL, quando um pedido pago sair dividido, orientar por WhatsApp os
entregadores aprovados em algum produto da loja, mas não em todos, a se
afiliarem aos produtos que faltaram, e avisar o seller, no máximo uma vez por
entregador, por loja, por semana.

#### Scenario: Dois pedidos divididos na mesma semana

- **WHEN** dois pedidos da mesma loja saem divididos na mesma semana
- **THEN** cada entregador elegível recebe uma única mensagem e o seller um único
  aviso

#### Scenario: Loja sem nenhum entregador aprovado

- **WHEN** nenhum entregador está aprovado em produto algum da loja
- **THEN** só o seller é avisado

### Requirement: Simulador de viabilidade no avião

O sistema SHALL mostrar ao seller, para um produto e uma quantidade, a classe
exigida, o frete, o percentual do frete sobre o pedido e a quantidade a partir
da qual o frete fica em até 20% do pedido, apenas como sugestão.

#### Scenario: Pedido pequeno de produto leve

- **WHEN** o seller simula um produto com quantidade mínima de 5 a 5 km
- **THEN** o simulador parte de 5 unidades, mostra classe, menor e maior frete
  entre os parceiros, o percentual e a quantidade a partir da qual o frete fica
  em até 20%, sugerindo subir o mínimo sem alterar o produto

## REMOVED Requirements

### Requirement: Exclusividade de 5 minutos do afiliado da loja

**Reason**: substituída pelo primeiro elegível que aceitar (PRD 054, decisão 4).

### Requirement: R$/km por produto e piso por loja

**Reason**: substituídos pelos custos declarados pelo parceiro e pelo piso por
classe (PRD 054, decisões 8 e 13).
