## Purpose

Evita que o admin (ou seller) grave faixas de frete erradas por engano ao subir uma planilha — o import da tabela de frete passa a ter uma etapa de revisão antes de gravar, e aceita CSV ou XLSX.

## ADDED Requirements

### Requirement: Preview antes de gravar a tabela de frete
Ao subir uma planilha de tabela de frete, o sistema SHALL processar o arquivo e exibir as faixas resultantes para revisão antes de gravar qualquer linha em `transportadora_faixas_frete`.

#### Scenario: Upload com linhas válidas
- **WHEN** o usuário sobe uma planilha com linhas válidas
- **THEN** o sistema exibe a lista de faixas candidatas (CEP destino, faixa de peso, valor) sem gravar nada até confirmação explícita

#### Scenario: Usuário remove uma linha do preview antes de confirmar
- **WHEN** o usuário desmarca uma ou mais faixas candidatas na tela de preview e confirma
- **THEN** apenas as faixas ainda marcadas são gravadas

#### Scenario: Usuário fecha o preview sem confirmar
- **WHEN** o usuário sai da tela de preview sem clicar em confirmar
- **THEN** nenhuma faixa é gravada

### Requirement: Upload aceita CSV ou XLSX
O sistema SHALL aceitar arquivos `.csv` e `.xlsx` para os dois uploads (lista de transportadoras e tabela de frete), usando um parser próprio sem dependência de terceiros para XLSX.

#### Scenario: Upload de arquivo XLSX
- **WHEN** o usuário sobe um arquivo `.xlsx` com a primeira aba no formato esperado
- **THEN** o sistema extrai as linhas da primeira aba e segue o mesmo fluxo de preview do CSV

#### Scenario: XLSX com múltiplas abas
- **WHEN** o arquivo XLSX tem mais de uma aba
- **THEN** o sistema processa apenas a primeira aba e informa essa limitação na tela

#### Scenario: XLSX com fórmulas
- **WHEN** uma célula da planilha contém fórmula em vez de valor literal
- **THEN** o sistema trata a célula como vazia/inválida (mesmo comportamento de campo ausente), sem tentar calcular a fórmula
