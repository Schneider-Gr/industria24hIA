## Why

O advisor de segurança do Supabase (lint `security_definer_view`, nível ERROR) reporta 11 views em `public` como "Security Definer View" — views que rodam com o privilégio de quem as criou em vez de quem consulta, contornando a RLS da tabela base.

Todas as 11 são falso positivo estrutural para este projeto, não um bug: cada uma substitui de propósito uma RLS policy que vazava PII/financeiro (`lojas_public_read`, `linha_itens_afiliado_read`) ou nunca teve policy para o papel que precisa ler o agregado (`favoritos`, `avaliacoes_produto`, `coletiva_participacoes`). O fix "padrão" do advisor (`security_invoker=true`) reaplicaria a RLS da tabela base — que foi removida ou nunca existiu para `anon`/`authenticated` — e zeraria o resultado: vitrine pública e painéis de afiliado parariam de mostrar dado nenhum. `anon`/`authenticated` são papéis únicos compartilhados no Supabase/PostgREST (sem role por usuário), então não há como restringir por linha via GRANT sem fragmentar o papel — mudança de arquitetura fora de escopo.

O risco real que sobra não é o advisor: é um side-channel de planner. Sem `security_barrier=true`, o planner do Postgres pode empurrar uma função do lado do consumidor (ex.: `select * from afiliado_ganhos where minha_func(valor)`) para antes do filtro de tenant da própria view (`afiliado_id = auth.uid()`), vazando linhas de outros usuários via erro ou timing de uma função marcada leaky.

Este change consolida em spec o hardening que já foi feito em 3 PRs distintos ao longo de agosto/2026 (#294, #297, #307 — migrations 0124, 0126, 0130), para que a regra vire documentação consultável em vez de conhecimento espalhado em mensagens de commit.

## What Changes

- Documenta como capability (`seguranca-views-security-barrier`) a regra: toda view pública que contorna RLS de propósito nasce com `security_barrier=true` na mesma migration que a cria ou passa a ter esse hardening quando o advisor a reportar.
- Nenhuma mudança de código nesta change — as 11 views já estão com `security_barrier=true` em produção (confirmado via `pg_class.reloptions` em 2026-08-19). O change formaliza a spec e fecha o ciclo Issue → PR → spec.

## Capabilities

### New Capabilities
- `seguranca-views-security-barrier`: regra de hardening para views públicas que contornam RLS de propósito no Supabase.

## Impact

- `supabase/migrations/0124_security_barrier_views_definer.sql`, `0126_security_barrier_views_definer_2.sql`, `0130_security_barrier_views_definer_3.sql` — já aplicadas em produção.
- `.claude/skills/rls-seguranca/SKILL.md` — já atualizada com a seção "Views que contornam RLS de propósito" (e espelhada em `Industria24/.claude/skills/rls-seguranca/`).
- Nenhum código de aplicação (`src/`) é afetado.
