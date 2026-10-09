## ADDED Requirements

### Requirement: Simulador de preço por quantidade e prazo
O painel do seller SHALL ter uma página que, para um produto, mostra a quantidade mínima
viável pelo frete do afiliado logístico e uma matriz quantidade × prazo de entrega com o
preço por unidade pago pelo comprador (com frete) e, por prazo, o desconto sugerido que
mantém o lucro por unidade de hoje, o desconto máximo sem prejuízo e o lucro resultante.
Custo, markup e economia por mês SHALL ser usados só na simulação.

#### Scenario: Desconto sugerido pelo prazo
- **WHEN** à vista R$ 250, comissão 5%, custo hoje R$ 180 e o custo cai 3% ao mês
- **THEN** o desconto sugerido é 1% em 15 dias, 2% em 30, 4% em 60 e 6% em 90

#### Scenario: Produto caro e pesado
- **WHEN** a Fibra de Coco (33 kg, R$ 250, mínima 6) é simulada a 15 km
- **THEN** a quantidade mínima viável é 6 e a tela diz que pedir mais quase não baixa o preço

#### Scenario: Produto barato e leve
- **WHEN** alface (0,22 kg, R$ 4,50, mínima 10) é simulada a 15 km
- **THEN** a quantidade mínima viável é 46

#### Scenario: Levar os descontos para a venda futura
- **WHEN** o seller clica em "Criar lote de venda futura com estes descontos"
- **THEN** o formulário da venda futura abre com o produto e os degraus preenchidos
