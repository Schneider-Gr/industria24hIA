## Purpose

Permite ao seller enxergar as tabelas de frete globais cadastradas pelo admin, subir a tabela de frete das próprias transportadoras, e sobrescrever pontualmente faixas de uma transportadora global para a própria loja — sem exigir que o admin gerencie exceção por loja.

## ADDED Requirements

### Requirement: Visualização de transportadoras globais
O sistema SHALL exibir ao seller, em modo somente leitura, as transportadoras globais ativas e suas faixas de frete importadas pelo admin.

#### Scenario: Seller acessa a lista de transportadoras
- **WHEN** o seller abre `/seller/transportadoras`
- **THEN** o sistema lista as transportadoras globais ativas com suas faixas, e separadamente as transportadoras próprias da loja

### Requirement: Upload da tabela de frete própria da loja
O sistema SHALL permitir que o seller cadastre transportadoras próprias e envie a tabela de frete delas, no mesmo formato e fluxo de validação do upload do admin, associadas à própria loja.

#### Scenario: Seller sobe tabela de transportadora própria
- **WHEN** o seller envia uma planilha de tarifas para uma transportadora cadastrada pela própria loja
- **THEN** as faixas resultantes são gravadas com `loja_id` da loja do seller e usadas apenas no cálculo de frete daquela loja

### Requirement: Sobrescrita de faixa de transportadora global
O sistema SHALL permitir que o seller sobrescreva, para a própria loja, uma faixa específica (mesmo intervalo de CEP destino e de peso) de uma transportadora global, sem alterar a faixa original vista pelas outras lojas.

#### Scenario: Seller sobrescreve uma faixa
- **WHEN** o seller edita ou sobe uma faixa com o mesmo `cep_destino_inicial`/`cep_destino_final`/`peso_min`/`peso_max` de uma faixa global de uma transportadora global
- **THEN** o sistema grava uma faixa nova com `loja_id` da loja do seller, e o cálculo de frete dos pedidos dessa loja passa a usar o valor sobrescrito para aquela faixa

#### Scenario: Outra loja não é afetada pela sobrescrita
- **WHEN** uma loja diferente da que sobrescreveu a faixa processa um pedido na mesma faixa de CEP/peso da mesma transportadora global
- **THEN** o cálculo de frete dessa outra loja continua usando o valor da faixa global, sem qualquer alteração

#### Scenario: Prioridade da faixa da loja sobre a global no cálculo
- **WHEN** o checkout de um pedido de uma loja calcula o frete de uma transportadora que tem tanto uma faixa global quanto uma faixa da própria loja cobrindo o mesmo CEP e peso
- **THEN** o sistema usa o valor da faixa da própria loja, ignorando a faixa global equivalente
