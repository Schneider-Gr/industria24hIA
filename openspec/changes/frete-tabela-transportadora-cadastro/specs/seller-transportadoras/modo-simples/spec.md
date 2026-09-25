## Purpose

Permite ao seller preencher o preço de uma transportadora pequena numa grade de zona × veículo por CD, sem planilha, e ter essa grade convertida em faixas de CEP usadas no frete.

## ADDED Requirements

### Requirement: Grade zona × veículo por CD
O sistema SHALL oferecer, por transportadora própria e por CD com CEP, uma grade com linhas de zonas de destino (Norte, Sul, Leste, Oeste, Centro-Sul, Centro-Oeste, Rural, Distrito Industrial de Manaus e as cidades vizinhas Iranduba, Manacapuru, Rio Preto da Eva, Presidente Figueiredo e Careiro) e colunas de veículos (moto, carro, utilitário). Cada veículo SHALL ter peso máximo e medidas máximas editáveis. Cada célula SHALL aceitar preço; a grade SHALL aceitar prazo mínimo e máximo, zonas não atendidas e, em "Avançado", AdValorem, ICMS, frete mínimo e taxa fixa. Veículo sem preço SHALL significar que a transportadora não tem esse veículo.

#### Scenario: Preencher e salvar
- **WHEN** o seller preenche Zona Norte com moto R$ 15 e carro R$ 40 e salva
- **THEN** o sistema grava a grade e mostra no preview as faixas de CEP geradas para a Zona Norte, uma por veículo

#### Scenario: Zona sem preço
- **WHEN** uma zona fica sem preço em todos os veículos
- **THEN** a zona é tratada como não atendida e não gera faixa

#### Scenario: CD sem CEP
- **WHEN** o seller tenta preencher a grade para um CD sem CEP
- **THEN** o sistema recusa e pede o CEP do CD

### Requirement: Conversão da grade em faixas de CEP
Ao salvar, o sistema SHALL converter cada célula com preço em faixas de CEP de destino da zona, com origem no CEP do CD, peso máximo do veículo e o preço da célula, substituindo as faixas geradas antes pela grade daquele CD e daquela transportadora.

#### Scenario: Resalvar a grade
- **WHEN** o seller muda o preço da moto na Zona Norte de R$ 15 para R$ 18 e salva
- **THEN** as faixas da grade daquele CD passam a ter R$ 18, sem sobrar faixa com R$ 15

#### Scenario: Copiar de outro CD
- **WHEN** o seller usa "Copiar de outro CD"
- **THEN** a grade do CD atual é preenchida com os valores do CD de origem e só é gravada quando o seller salvar

### Requirement: Limites de veículo coerentes
O sistema SHALL recusar a gravação quando o peso máximo ou alguma medida máxima de um veículo menor (moto < carro < utilitário) for maior que a de um veículo maior.

#### Scenario: Moto maior que carro
- **WHEN** o seller informa moto até 50 kg e carro até 30 kg
- **THEN** o sistema não grava e aponta os limites incoerentes
