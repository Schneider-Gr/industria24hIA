## Purpose

Automatizar a verificação de drift entre o schema real do banco Supabase e o histórico de migrations esperado, já que o comando `migration list` é sabido reportar estado incorreto sob drift.

## ADDED Requirements

### Requirement: Verificação automatizada de drift de schema
O sistema SHALL executar uma verificação periódica que compara o estado real do banco (via `db query --linked`) com o histórico de migrations esperado no repositório.

#### Scenario: Nenhum drift detectado
- **WHEN** a verificação confirma que todos os objetos esperados pelas migrations existem no banco real
- **THEN** o sistema registra a verificação como bem-sucedida, sem alertar

#### Scenario: Drift detectado
- **WHEN** a verificação encontra um objeto esperado por uma migration aplicada que não existe no banco, ou um objeto inesperado
- **THEN** o sistema registra a divergência e dispara alerta identificando a migration e o objeto afetado

### Requirement: Verificação não depende exclusivamente de `migration list`
O sistema SHALL basear a verificação de drift em consulta direta ao schema real (`db query --linked`), não apenas no histórico reportado por `migration list`, dado que este último já demonstrou reportar estado incorreto sob drift.

#### Scenario: `migration list` reporta migration aplicada mas objeto não existe
- **WHEN** `migration list` indica uma migration como aplicada mas a consulta direta ao schema não encontra o objeto correspondente
- **THEN** o sistema trata essa migration como drift, priorizando a consulta direta sobre o histórico reportado

### Requirement: Verificação de colisão de numeração antes de push
O sistema SHALL incluir, na mesma verificação, uma checagem de colisão de prefixo numérico entre arquivos de migration antes de um PR ser aberto ou mergeado.

#### Scenario: Dois arquivos de migration com mesmo prefixo numérico
- **WHEN** dois arquivos em `supabase/migrations/` compartilham o mesmo prefixo numérico
- **THEN** a verificação falha de forma explícita, identificando os arquivos em colisão
