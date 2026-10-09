## ADDED Requirements

### Requirement: Curva de desconto por antecedência no lote
O lote de venda futura SHALL aceitar até 3 degraus `{dias_antes, desconto_pct}`, com
`dias_antes` inteiro positivo e distinto, `desconto_pct` inteiro de 1 a 90, e desconto não
crescente em direção à entrega. Lote sem degraus SHALL manter o comportamento atual.

#### Scenario: Curva válida
- **WHEN** o seller salva 60 dias/15%, 30 dias/10%, 7 dias/5%
- **THEN** o lote é gravado com os três degraus

#### Scenario: Desconto crescente perto da entrega
- **WHEN** o seller salva 60 dias/5% e 7 dias/15%
- **THEN** a gravação é recusada indicando o degrau inválido

#### Scenario: Quatro degraus
- **WHEN** o seller tenta salvar quatro degraus
- **THEN** a gravação é recusada

### Requirement: Preço da reserva pela curva e pela faixa de volume
Para lote com curva, o preço unitário SHALL ser `preco_faixa(produto, qtd)` × (1 − desconto
do degrau vigente na data da reserva), arredondado em centavos (meio para cima) e limitado
ao preço à vista. O degrau vigente SHALL ser o de maior `dias_antes` que seja menor ou igual
aos dias entre a data da reserva (fuso America/Manaus) e a data de entrega; sem degrau
aplicável, o desconto SHALL ser zero.

#### Scenario: Reserva cedo com volume
- **WHEN** à vista R$ 15,90, faixa de 50+ un. R$ 14,90, curva 60/15, entrega 15/12/2026, reserva de 50 un. em 09/10/2026
- **THEN** o preço unitário é R$ 12,67

#### Scenario: Último dia do degrau
- **WHEN** a reserva de 1 un. é feita em 16/10/2026 no mesmo lote
- **THEN** vale o degrau de 60 dias e o preço é R$ 13,52

#### Scenario: Degrau virou
- **WHEN** a reserva de 1 un. é feita em 17/10/2026
- **THEN** vale o degrau de 30 dias e o preço é R$ 14,31

#### Scenario: Lote sem curva
- **WHEN** o lote não tem degraus e tem `valor` R$ 14,90
- **THEN** o preço é R$ 14,90 para qualquer quantidade, como hoje

### Requirement: Checkout usa o preço da curva
`checkout_criar_pedido` SHALL calcular o item de venda futura com curva pela mesma função
de preço do banco, nunca pelo valor enviado pelo navegador, e SHALL recusar lote com mínimo
de reservas.

#### Scenario: Valor adulterado no carrinho
- **WHEN** o carrinho envia valor menor que o calculado
- **THEN** o pedido é criado com o valor calculado pelo banco

#### Scenario: Lote com mínimo no checkout
- **WHEN** um item de lote com mínimo chega ao checkout
- **THEN** o checkout recusa com a orientação de usar Reservar

### Requirement: Simulador no cadastro do lote
O formulário de nova venda futura SHALL mostrar, sem gravar nada, uma matriz faixa de volume
× degrau com preço por unidade, desconto total sobre o à vista e líquido depois da comissão
do produto, além da receita mínima e máxima do lote pela produção prevista. O cálculo SHALL
usar a mesma regra do banco e responder a cada alteração em menos de 1 s.

#### Scenario: Matriz do açaí
- **WHEN** o seller simula à vista R$ 15,90, faixas 20+ R$ 15,40 e 50+ R$ 14,90, curva 60/15, 30/10, 7/5 e comissão 5%
- **THEN** a célula 50+ × 60 dias mostra R$ 12,67, −20% e líquido R$ 12,04

#### Scenario: Comissão indisponível
- **WHEN** a comissão do produto não pode ser lida
- **THEN** o simulador usa 5% e marca o líquido como estimativa

#### Scenario: Margem baixa
- **WHEN** alguma célula passa de 30% de desconto total
- **THEN** o simulador mostra aviso de margem sem bloquear o registro

### Requirement: Vitrine mostra o desconto e a validade do degrau
O card do lote SHALL mostrar o preço à vista riscado, o preço do degrau atual, o selo
"X% abaixo do à vista" e "Preço válido até DD/MM · depois R$ Y".

#### Scenario: Último degrau já passou
- **WHEN** não há degrau aplicável e a entrega ainda não chegou
- **THEN** o card mostra o preço sem desconto de antecedência e sem selo de validade
