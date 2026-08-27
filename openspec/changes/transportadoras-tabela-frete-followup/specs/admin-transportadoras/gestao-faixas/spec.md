## Purpose

Permite ao admin (e ao seller, para as próprias faixas) enxergar e desativar individualmente as faixas de frete importadas de uma transportadora, sem depender de acesso direto ao banco.

## ADDED Requirements

### Requirement: Listagem de faixas por transportadora
O sistema SHALL exibir, para uma transportadora selecionada, a lista completa de suas faixas de frete (CEP destino, faixa de peso, valor, e se é global ou de uma loja específica).

#### Scenario: Transportadora com faixas globais e de loja
- **WHEN** o admin abre a página de faixas de uma transportadora que tem faixas globais e faixas de override de lojas
- **THEN** o sistema lista todas, identificando cada uma como "Global" ou pelo nome da loja dona do override

### Requirement: Desativação individual de faixa
O sistema SHALL permitir desativar uma faixa específica sem afetar as demais faixas da mesma transportadora.

#### Scenario: Admin desativa uma faixa
- **WHEN** o admin desativa uma faixa global
- **THEN** essa faixa deixa de ser retornada por `cotar_frete_tabela` para qualquer loja, e as demais faixas continuam ativas

#### Scenario: Seller desativa uma faixa própria
- **WHEN** o seller desativa uma faixa de override da própria loja
- **THEN** essa faixa deixa de valer para a loja dele, e a faixa global equivalente (se existir) volta a ser usada no cálculo de frete daquela loja
