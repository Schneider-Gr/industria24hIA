# Logística: simulador do avião por veículo, região e travessia

## ADDED Requirements

### Requirement: Bandas de frete por veículo no produto

O sistema SHALL permitir ao seller definir, por produto, tarifa mínima e R$/km
para moto (até 20 kg), carro (até 300 kg) e caminhão (acima de 300 kg), e
SHALL recusar R$/km abaixo do piso do veículo (R$ 6, R$ 8 e R$ 20).

#### Scenario: Banda abaixo do piso

- **WHEN** o seller salva R$ 7,00/km no carro
- **THEN** o sistema recusa com "Carro: R$/km mínimo é R$ 8,00." e nada é gravado

#### Scenario: Banda vazia

- **WHEN** o seller deixa o R$/km do caminhão vazio
- **THEN** a simulação usa o piso de R$ 20,00/km para o caminhão

### Requirement: Quantidade mínima salva com as bandas

O sistema SHALL gravar a quantidade mínima por pedido junto com as bandas e
SHALL ligar a entrega por parceiro do produto ao salvar.

#### Scenario: Salvar

- **WHEN** o seller salva bandas válidas e quantidade mínima 36
- **THEN** o produto fica com as bandas, `quantidade_minima` = 36 e entrega por
  parceiro ligada

### Requirement: Custo total por região

O sistema SHALL calcular, para cada região de referência (perto, médio, longe),
o frete = maior entre a tarifa mínima e km de estrada × R$/km da banda do
veículo que o peso da quantidade exige, mais a balsa quando houver, e SHALL
mostrar o % sobre o pedido com as faixas até 10% ótimo e até 20% viável.

#### Scenario: Tarifa mínima prevalece

- **WHEN** 10 sacos de 50 kg a R$ 38 vão ao Centro (4,8 km) com caminhão a
  R$ 22/km e tarifa mínima R$ 150
- **THEN** o frete é R$ 150,00 (km daria R$ 105,60) e o % é 39%, inviável

### Requirement: Quantidade viável e ideal com troca de veículo

O sistema SHALL recalcular o frete a cada quantidade (a troca de veículo muda o
frete) e SHALL mostrar a menor quantidade viável (≤ 20%) e ideal (≤ 10%) por
região; quando a viabilidade existe numa faixa menor e some com a troca de
veículo, SHALL mostrar as duas faixas.

#### Scenario: Viabilidade fura na troca de veículo

- **WHEN** o cimento de 50 kg (R$ 38) vai ao Centro com carro R$ 9/km (tarifa
  R$ 40) e caminhão R$ 22/km (tarifa R$ 150)
- **THEN** o sistema mostra "viável com 6 un. (carro) ou a partir de 20 un."

#### Scenario: Nenhuma quantidade viável

- **WHEN** nenhuma quantidade até 1000 deixa o frete ≤ 20%
- **THEN** o sistema mostra "inviável nessa distância"

### Requirement: Grade quantidade × R$/km

O sistema SHALL mostrar, por região, uma grade de quantidades por valores de
R$/km do veículo com o % do frete no pedido e as marcas viável e ideal, e
SHALL preencher R$/km da banda e quantidade mínima ao clicar numa célula.

#### Scenario: Clique na célula

- **WHEN** o seller clica na célula "40 un. × R$ 22" da região médio
- **THEN** o R$/km do caminhão vira 22,00 e a quantidade mínima vira 40, sem salvar

### Requirement: Travessia detectada na rota

O sistema SHALL identificar trechos de barco pela manobra `FERRY` da Routes API,
SHALL excluir o km de barco do km cobrado e SHALL somar a balsa só de ida,
calculada pela tabela de travessias e pelo fator do veículo, com valor editável
na simulação.

#### Scenario: Rota com balsa

- **WHEN** a rota até Manaquiri tem 157,8 km, dos quais 11,9 km de barco
- **THEN** o km cobrado é 145,9 e a região mostra "Travessia detectada" com a
  balsa somada uma vez

#### Scenario: Fator não oficial

- **WHEN** o fator do veículo na tabela está marcado como estimativa
- **THEN** o valor da balsa aparece com "estimativa, confirme com o operador"

### Requirement: Destino sem rota por estrada

O sistema SHALL avisar quando a Routes API não encontra rota por estrada e
SHALL oferecer informar a travessia manualmente ou tratar como entrega a
combinar.

#### Scenario: Careiro da Várzea

- **WHEN** a região aponta para Careiro da Várzea e o Google devolve "sem rota"
- **THEN** a região mostra "Sem rota por estrada: pode exigir barco" com as
  opções "Informar travessia" e "Entrega a combinar"

### Requirement: Tabela de travessias da plataforma

O sistema SHALL manter uma tabela de travessias (linha, categoria de veículo,
fator de equivalência, valor, fonte e data), legível por usuários autenticados
e editável só pelo admin, e SHALL exibir a fonte e a data ao seller.

#### Scenario: Seller tenta editar a tabela

- **WHEN** um seller tenta gravar na tabela de travessias
- **THEN** o banco recusa

#### Scenario: Admin atualiza reajuste

- **WHEN** o admin muda o valor por veículo equivalente e a data
- **THEN** as próximas simulações usam o valor novo e mostram a nova data
