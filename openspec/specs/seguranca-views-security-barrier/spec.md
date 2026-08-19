# seguranca-views-security-barrier Specification

## Purpose
Views públicas que contornam a RLS da tabela base de propósito (agregação pública ou substituição de policy removida) precisam fechar o side-channel de planner que o Postgres abre sem `security_barrier=true`, mesmo quando `security_invoker=true` não é viável.
## Requirements
### Requirement: Toda view que contorna RLS de propósito tem security_barrier=true
O sistema SHALL manter `security_barrier=true` em toda view de `public` que: (a) substitui uma RLS policy removida da tabela base para evitar vazamento de PII/financeiro, ou (b) expõe agregação pública (contagem, média) sobre uma tabela cuja RLS restringe cada linha ao próprio dono.

#### Scenario: View nova do mesmo padrão
- **WHEN** uma migration cria uma view pública que precisa ler além da RLS "dono só vê a própria linha" da tabela base (agregação ou substituição de policy)
- **THEN** a mesma migration aplica `alter view ... set (security_barrier = true)` na view

#### Scenario: Advisor reporta security_definer_view numa view existente do padrão
- **WHEN** o advisor do Supabase reporta uma view existente como "Security Definer View" e a view segue o padrão de contorno de propósito (não é um SECURITY DEFINER acidental)
- **THEN** a correção aplicada é `security_barrier=true`, nunca `security_invoker=true`, e o motivo fica documentado num comentário SQL na migration

### Requirement: security_invoker não é aplicado sem confirmar RLS equivalente
O sistema SHALL NOT aplicar `security_invoker=true` numa view do padrão de contorno de propósito sem antes confirmar, via `supabase db query --linked`, que existe RLS equivalente na tabela base para o papel `anon`/`authenticated` que preserva o resultado esperado.

#### Scenario: Advisor sugere security_invoker como fix
- **WHEN** o advisor ou uma ferramenta automatizada sugere `security_invoker=true` como correção
- **THEN** antes de aplicar, confirma-se que a tabela base tem RLS que devolve o mesmo resultado para o papel consultante — se não tiver, a correção é `security_barrier=true`

### Requirement: Estado real verificado no banco, não no advisor
O sistema SHALL verificar o estado real de `security_barrier` das views afetadas consultando `pg_class.reloptions` via `supabase db query --linked --file`, não confiando apenas no relatório do advisor ou em `supabase migration list` (que pode mentir sob drift).

#### Scenario: Confirmação pós-deploy
- **WHEN** uma migration de hardening de view é aplicada em produção
- **THEN** o resultado é confirmado com `select relname, reloptions from pg_class where relname = '<view>'` antes de considerar o trabalho concluído

