## Purpose

Garantir que o `npm run lint` rodado na máquina do dev produza o mesmo sinal
que o CI produz, analisando apenas código rastreado da aplicação.

## ADDED Requirements

### Requirement: Lint analisa apenas código rastreado da aplicação
O sistema SHALL excluir da análise do ESLint os diretórios que existem só na
máquina do dev ou que contêm artefato gerado: worktrees git (`web-worktrees/`,
`.claude/worktrees/`), ambiente Python de carga (`loadtest/`) e saída do
graphify (`graphify-out/`).

#### Scenario: Dev com worktrees paralelas no checkout
- **WHEN** o dev roda `npm run lint` num checkout que contém worktrees de outras branches, cada uma com seu `.next` compilado
- **THEN** o relatório cobre apenas os arquivos da aplicação, sem nenhum achado vindo dessas worktrees

#### Scenario: Paridade com o CI
- **WHEN** o mesmo commit é lintado localmente e no job `lint-build` do CI
- **THEN** os dois relatórios apontam o mesmo conjunto de achados

### Requirement: Existe script de correção automática
O sistema SHALL expor `npm run lint:fix`, executando `eslint --fix`, sem
alterar o comportamento do `npm run lint`, que segue apenas reportando.

#### Scenario: Dev quer corrigir o que é automatizável
- **WHEN** o dev roda `npm run lint:fix`
- **THEN** o ESLint aplica as correções automáticas no código e reporta o que sobrou

### Requirement: Código da aplicação sem erro de lint
O sistema SHALL manter zero erros de ESLint no código da aplicação. Aviso é
tolerado como dívida registrada; erro não.

#### Scenario: PR novo
- **WHEN** o job `lint-build` roda num PR
- **THEN** o `npm run lint` termina sem nenhum erro
