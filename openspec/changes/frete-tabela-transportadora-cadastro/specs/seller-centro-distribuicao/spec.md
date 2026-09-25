## ADDED Requirements

### Requirement: CEP, endereço e retirada do CD
O sistema SHALL exigir CEP de 8 dígitos válido e endereço ao criar ou editar um centro de distribuição, e SHALL permitir marcar se o centro aceita retirada, com horários de retirada. O CEP SHALL ser validado por consulta de CEP antes de gravar. Centros existentes sem CEP SHALL continuar existindo e SHALL aparecer como pendência no painel de transportadoras até serem corrigidos.

#### Scenario: CEP válido
- **WHEN** o seller cria o CD "Galpão Distrito" com CEP 69075-000 e endereço
- **THEN** o centro é gravado com o CEP sem máscara e o endereço

#### Scenario: CEP inexistente
- **WHEN** o seller informa um CEP que a consulta de CEP não encontra
- **THEN** o centro não é gravado e o sistema pede correção

#### Scenario: Edição de centro antigo sem CEP
- **WHEN** o seller edita um centro que foi criado sem CEP
- **THEN** o sistema só grava a edição se o CEP e o endereço forem informados

#### Scenario: Localização em texto livre incoerente
- **WHEN** o centro tem localização em texto livre que aponta para outro país
- **THEN** o sistema não converte o texto sozinho; o centro fica como pendência até o seller informar o CEP

#### Scenario: Aceita retirada
- **WHEN** o seller marca "aceita retirada" e informa os horários
- **THEN** o centro passa a constar como ponto de retirada da loja com esses horários
