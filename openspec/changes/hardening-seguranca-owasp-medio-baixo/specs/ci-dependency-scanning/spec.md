## Purpose

Garantir que uma dependência npm com vulnerabilidade conhecida seja detectada automaticamente em
todo PR, em vez de depender de auditoria manual esporádica — a mesma lacuna que deixou o Next.js
desatualizado (achado #1 do relatório OWASP) sem alerta por meses.

## ADDED Requirements

### Requirement: CI bloqueia dependência com vulnerabilidade de severidade alta ou crítica
O sistema SHALL rodar `npm audit --audit-level=high` como parte do CI em todo PR, falhando o job
quando houver vulnerabilidade de severidade `high` ou `critical` sem correção aplicada.

#### Scenario: PR introduz dependência com CVE alto
- **WHEN** um PR altera `package.json`/`package-lock.json` para uma versão com vulnerabilidade
  `high` ou `critical` conhecida
- **THEN** o job de CI falha e reporta o pacote e a severidade

#### Scenario: PR sem dependência vulnerável
- **WHEN** nenhuma dependência do lockfile tem vulnerabilidade `high` ou `critical`
- **THEN** o job de CI passa normalmente

### Requirement: Dependabot abre PR automático para atualização de segurança
O repositório SHALL ter `dependabot.yml` configurado para o ecossistema npm, gerando PRs
automáticos quando uma atualização de segurança estiver disponível.

#### Scenario: Nova versão corrige vulnerabilidade em dependência existente
- **WHEN** o GitHub Advisory Database publica uma correção de segurança para um pacote usado no
  projeto
- **THEN** o Dependabot abre um PR atualizando o pacote para a versão corrigida
