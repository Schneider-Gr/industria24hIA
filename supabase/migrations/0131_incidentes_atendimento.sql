-- Tickets/incidentes de atendimento (spec #311): espelho de auditoria no
-- admin do escalonamento humano do bot. Jira continua sendo o sistema de
-- trabalho real (src/lib/ai/jira.ts) — este registro nasce ANTES da
-- tentativa de Jira e não depende dela ter funcionado, porque hoje
-- `bot_conversas.jira_issue_key` não é lido em nenhuma UI (achado do
-- brainstorm) e o token do Jira já rotacionou/expirou no passado.

create table if not exists public.incidentes_atendimento (
  id            uuid primary key default gen_random_uuid(),
  conversa_id   uuid not null references public.bot_conversas (id) on delete cascade,
  resumo        text not null check (length(btrim(resumo)) between 1 and 2000),
  status        text not null default 'aberto' check (status in ('aberto', 'resolvido')),
  jira_issue_key text,
  created_at    timestamptz not null default now(),
  resolvido_em  timestamptz
);

create index if not exists incidentes_atendimento_status_idx on public.incidentes_atendimento (status, created_at desc);

alter table public.incidentes_atendimento enable row level security;

create policy incidentes_atendimento_admin_all on public.incidentes_atendimento for all
  using (public.is_admin()) with check (public.is_admin());
