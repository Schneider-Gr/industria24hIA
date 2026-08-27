## Purpose

Permite ao admin cadastrar transportadoras em lote e importar a tabela real de tarifas de frete (faixa de CEP destino × faixa de peso → valor) de cada transportadora, em vez de digitar linha a linha ou depender só do percentual fixo por faixa de CEP.

## ADDED Requirements

### Requirement: Upload em massa de transportadoras
O sistema SHALL permitir que o admin envie um arquivo CSV/XLSX com uma lista de transportadoras (nome, fonte, prazo) e cadastre todas as linhas válidas, rejeitando individualmente as inválidas sem interromper o import.

#### Scenario: Arquivo com linhas válidas e inválidas misturadas
- **WHEN** o admin envia um arquivo com 10 linhas, sendo 2 com `fonte` fora do enum permitido
- **THEN** o sistema cadastra as 8 linhas válidas como transportadoras globais e exibe um relatório apontando as 2 linhas rejeitadas e o motivo

### Requirement: Upload da tabela de frete de uma transportadora
O sistema SHALL permitir que o admin selecione uma transportadora já cadastrada e envie um arquivo com a tabela de tarifas (CEP origem, CEP destino, peso e demais dimensões, valor do frete), convertendo cada linha em uma faixa de CEP destino × faixa de peso associada àquela transportadora.

#### Scenario: Planilha no formato modelo (uma linha = uma cotação pontual)
- **WHEN** o admin envia uma planilha com uma linha por par de CEP/peso específico (sem faixas explícitas)
- **THEN** o sistema converte cada linha em uma faixa de largura mínima (`cep_destino_inicial=cep_destino_final`, `peso_min=peso_max`) e apresenta o preview antes de confirmar

#### Scenario: Linha com CEP inválido ou mal formatado
- **WHEN** uma linha da planilha tem CEP fora do padrão (ex.: faltando dígito, com letras)
- **THEN** o loop de validação tenta normalizar automaticamente quando o erro é determinístico (ex.: máscara), e sinaliza no preview como erro bloqueante quando não consegue corrigir com segurança, sem gravar nenhuma faixa daquele import até o admin resolver ou remover a linha

#### Scenario: Confirmação do import
- **WHEN** o admin revisa o preview das faixas geradas e confirma
- **THEN** o sistema grava as faixas em `transportadora_faixas_frete` com `loja_id=null` (faixa global) e a transportadora passa a ter `fonte='tabela_importada'`

### Requirement: Visualização das faixas importadas
O sistema SHALL exibir, por transportadora, a lista de faixas de frete importadas (CEP destino, faixa de peso, valor), permitindo desativar uma faixa individualmente.

#### Scenario: Admin desativa uma faixa
- **WHEN** o admin desativa uma faixa específica de uma transportadora
- **THEN** essa faixa deixa de ser considerada no cálculo de frete do checkout, sem afetar as demais faixas da mesma transportadora
