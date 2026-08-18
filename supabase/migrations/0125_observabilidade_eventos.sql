-- Tabela de eventos de observabilidade (cron, RLS, drift, integrações, rate limit, agentes IA).
-- Escrita só via service role; leitura via rota autenticada do dashboard-ops.
create table if not exists observabilidade_eventos (
  id bigint generated always as identity primary key,
  capability text not null,
  origem text not null,
  resultado text not null check (resultado in ('sucesso', 'falha', 'alerta')),
  motivo text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists observabilidade_eventos_capability_created_at_idx
  on observabilidade_eventos (capability, created_at desc);

alter table observabilidade_eventos enable row level security;
-- Nenhuma policy: nega por padrão (regra 6 do CLAUDE.md do projeto).
-- Escrita e leitura passam por service role (registrar-evento.ts e a rota
-- de histórico do dashboard-ops), que ignora RLS.
