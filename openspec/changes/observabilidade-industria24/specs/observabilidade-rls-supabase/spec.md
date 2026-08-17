## Purpose

Registrar tentativas de acesso negadas por política RLS do Supabase, para permitir distinguir bug de política mal configurada de usuário legitimamente sem permissão.

## ADDED Requirements

### Requirement: Registro de negação de acesso por RLS
O sistema SHALL registrar quando uma consulta é negada por política RLS, incluindo a tabela afetada, o papel do usuário e o timestamp.

#### Scenario: Consulta negada por policy
- **WHEN** uma consulta ao banco é bloqueada por uma policy RLS
- **THEN** o sistema registra o evento com tabela, papel do usuário autenticado e timestamp, sem expor dado da linha negada

### Requirement: Distinção entre negação esperada e possível bug de policy
O sistema SHALL permitir sinalizar manualmente ou por heurística quando um padrão de negação se repete de forma que sugere bug de policy (ex.: usuário nega acesso a recurso que deveria possuir).

#### Scenario: Mesmo usuário negado repetidamente em recurso próprio
- **WHEN** um usuário autenticado é negado repetidamente ao tentar acessar um recurso do qual é o dono esperado (ex.: seu próprio pedido)
- **THEN** o sistema sinaliza esse padrão como candidato a investigação de bug de RLS

### Requirement: Registro não expõe dado sensível da linha negada
O sistema SHALL registrar apenas metadados da tentativa de acesso negado (tabela, papel, timestamp), sem incluir o conteúdo da linha ou dado sensível da consulta.

#### Scenario: Negação em tabela com dado financeiro
- **WHEN** uma consulta negada envolve uma tabela com dado financeiro sensível
- **THEN** o registro da negação não contém o valor ou dado financeiro da linha, apenas os metadados da tentativa
