## Purpose

Permite à plataforma cadastrar transportadoras negociadas para todos os sellers, controlar quais lojas as usam, encerrá-las com aviso e moderar transportadoras próprias de qualquer loja.

## ADDED Requirements

### Requirement: Cadastro da transportadora global
O sistema SHALL permitir ao admin cadastrar transportadora global com os mesmos campos, tabela (modo avançado) e nós de categoria da transportadora própria. A tabela global SHALL aceitar faixa de CEP de origem. A global SHALL começar desativada em todas as lojas.

#### Scenario: Global recém-cadastrada
- **WHEN** o admin cadastra a transportadora global "Transportadora Y" com tabela
- **THEN** ela aparece na lista de globais de todas as lojas como desativada

#### Scenario: Admin troca a tabela global
- **WHEN** o admin confirma uma tabela nova para uma global
- **THEN** as lojas que a ativaram veem o aviso "tabela atualizada" com a data

### Requirement: Ativação da global pela loja
O sistema SHALL permitir ao seller ativar uma global na própria loja somente informando o código de cliente dele na transportadora e aceitando "tenho contrato ativo com esta transportadora". O código SHALL ficar visível ao seller dono e ao admin, e a nenhuma outra loja. O seller SHALL poder desativar a global na loja a qualquer momento.

#### Scenario: Ativar com código e aceite
- **WHEN** o seller ativa a global informando o código de cliente "12345" e marcando o aceite
- **THEN** a global fica ativa na loja, com o código e a data do aceite gravados

#### Scenario: Ativar sem código ou sem aceite
- **WHEN** o seller tenta ativar sem código de cliente ou sem marcar o aceite
- **THEN** o sistema não ativa e aponta o que falta

#### Scenario: Nenhum produto dentro das origens da tabela
- **WHEN** nenhum produto da loja tem CEP de origem dentro das faixas de CEP de origem da tabela global
- **THEN** o sistema permite ativar e avisa que ela não vai atender a loja

### Requirement: Encerramento da global por data
O sistema SHALL permitir ao admin marcar a data de encerramento de uma global. As lojas que a usam SHALL ser avisadas 7 dias antes da data, e a partir da data a global SHALL deixar de estar ativa em todas as lojas. Pedidos já pagos com ela não mudam.

#### Scenario: Aviso antecipado
- **WHEN** faltam 7 dias para a data de encerramento
- **THEN** cada loja com a global ativa recebe aviso com a data e a sugestão de cadastrá-la como própria

#### Scenario: Data atingida
- **WHEN** chega a data de encerramento
- **THEN** a global deixa de estar ativa em todas as lojas e some da lista de ativação

### Requirement: Moderação de transportadora própria pelo admin
O sistema SHALL permitir ao admin listar as transportadoras próprias de todas as lojas e desativar qualquer uma informando o motivo. A desativada pelo admin SHALL mostrar o motivo ao seller e SHALL só ser reativada pelo admin. Pedidos já pagos com ela seguem normalmente.

#### Scenario: Admin desativa
- **WHEN** o admin desativa a transportadora própria de uma loja com o motivo "frete irreal"
- **THEN** a transportadora deixa de estar ativa, o seller vê o motivo e o botão de reativar fica indisponível para ele

#### Scenario: Seller tenta reativar
- **WHEN** o seller tenta reativar uma transportadora desativada pelo admin
- **THEN** a operação é recusada
