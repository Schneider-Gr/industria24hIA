## ADDED Requirements

### Requirement: Comissão por nó da taxonomia é gravada pelo admin
O sistema SHALL gravar o percentual de comissão informado por um administrador em `/admin/taxonomia` no nó correspondente, e SHALL reportar erro quando nenhuma linha for atualizada, em vez de indicar sucesso.

#### Scenario: Admin salva percentual
- **WHEN** um administrador informa 7 no nó e salva
- **THEN** `taxonomia_nos.comissao_pct` do nó passa a 7 e a tela mostra o nó como "próprio"

#### Scenario: Admin esvazia o percentual
- **WHEN** um administrador apaga o valor e salva
- **THEN** `comissao_pct` volta a nulo e o nó herda do ancestral

#### Scenario: Nó inexistente
- **WHEN** o id enviado não corresponde a nenhum nó
- **THEN** a action falha com erro e nada é gravado

### Requirement: Filhos exibem o percentual herdado real
Ao listar os filhos de um nó, o sistema SHALL exibir como herdado o percentual efetivo do pai, calculado por `taxonomia_comissao_pct`.

#### Scenario: Pai com percentual próprio
- **WHEN** o pai tem 7% e o filho não tem percentual
- **THEN** o filho mostra "herda 7,00%"
