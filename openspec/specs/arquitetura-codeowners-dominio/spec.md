# arquitetura-codeowners-dominio Specification

## Purpose
Garantir que todo PR aponte um dono esperado por path alterado, refletindo os
6 módulos de domínio, mesmo antes de existirem contas GitHub individuais para
os 2 devs novos.
## Requirements
### Requirement: CODEOWNERS cobre todos os módulos de domínio
O sistema SHALL manter `.github/CODEOWNERS` com uma entrada para cada um dos 6
módulos de domínio (`catalogo-compra`, `seller`, `afiliado`,
`logistica-parceiro`, `admin-plataforma`, `pagamentos-financeiro`) e para o
bloco de plataforma compartilhada, mapeando as pastas correspondentes de
`src/app/`, `src/components/` e `src/lib/`.

#### Scenario: PR altera arquivo de um módulo mapeado
- **WHEN** um PR altera um arquivo dentro de `src/app/(seller)/`
- **THEN** o GitHub aponta o dono do módulo `seller` como revisor esperado,
  conforme `.github/CODEOWNERS`

#### Scenario: Path novo sem módulo correspondente
- **WHEN** um PR cria um path que não se encaixa em nenhum módulo existente
  (ex.: domínio de produto novo)
- **THEN** o path cai sob o dono padrão (`*`) até o `.github/CODEOWNERS` ser
  atualizado com uma entrada específica

### Requirement: Comportamento explícito durante conta GitHub compartilhada
O sistema SHALL documentar, no PR que introduz ou altera o `CODEOWNERS` e em
qualquer artefato que descreva a modularização, que o gate de review por dono
diferente do autor não está ativo enquanto os devs dividirem uma única conta
GitHub — o arquivo funciona como documentação da estrutura-alvo nesse período.

#### Scenario: PR aberto durante período de conta compartilhada
- **WHEN** um PR é aberto e o autor é a mesma conta listada como owner do path
  alterado em `CODEOWNERS`
- **THEN** o sistema não trata isso como gate de review satisfeito de fato —
  a limitação é conhecida e documentada, não escondida

### Requirement: Atualização de dono sem redesenho de módulos
O sistema SHALL permitir que a transição para contas GitHub individuais seja
feita só trocando o e-mail de cada bloco existente pelo dono real, sem
necessidade de redesenhar a estrutura de módulos do `CODEOWNERS`.

#### Scenario: Dev novo recebe conta GitHub individual
- **WHEN** um dos 2 devs passa a ter conta GitHub própria
- **THEN** a atualização do `CODEOWNERS` troca apenas o e-mail das entradas do
  módulo sob responsabilidade desse dev, mantendo a mesma estrutura de paths

