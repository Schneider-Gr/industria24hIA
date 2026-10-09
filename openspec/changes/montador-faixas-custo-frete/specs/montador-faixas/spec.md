## ADDED Requirements

### Requirement: Montador de faixas por custo e frete
O painel do seller SHALL oferecer, nas promoções e na venda futura, um montador que
propõe quantidades de faixa de desconto progressivo e mostra, para cada uma, preço,
líquido do seller, markup atingido, desconto máximo sem ficar abaixo do custo, frete por
unidade em três distâncias e custo total por unidade para o comprador. Custo e markup
SHALL ser usados só na simulação, sem gravar.

#### Scenario: Markup informado
- **WHEN** à vista R$ 4,74, comissão 5% e markup 1,3
- **THEN** o líquido à vista é R$ 4,50, o custo equivalente R$ 3,46 e o desconto máximo 23%

#### Scenario: Frete diluído
- **WHEN** peso 0,3 kg/un., banda carro com tarifa mínima R$ 8 e R$ 2/km, distância 15 km
- **THEN** em 100 un. o frete é R$ 30 (R$ 0,30/un.) e em 10 un. a moto vale

#### Scenario: Produto sem peso ou bandas
- **WHEN** o produto não tem peso ou não tem bandas no avião
- **THEN** o montador mostra preço e margem, sem frete, e avisa para cadastrar no avião

#### Scenario: Gravar faixas
- **WHEN** o seller grava faixas 50 un. −5% e 200 un. −10%
- **THEN** a promoção ativa do produto passa a ter só essas duas faixas, com o preço calculado
