-- CRM — Gestão do Funil de Leads (PRD 002): histórico de interação e
-- responsável por lead. "Atrasado" (US03) não é coluna: é calculado na
-- consulta a partir de created_at / última interação, prazo de 3 dias
-- corridos (premissa do PRD 002, sem confirmação final do usuário).

alter table public.leads
  add column if not exists responsavel_id uuid references public.admins (user_id) on delete set null;

create index if not exists leads_responsavel_idx on public.leads (responsavel_id);

create table if not exists public.lead_interacoes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads (id) on delete cascade,
  autor_id   uuid not null references public.admins (user_id) on delete cascade,
  conteudo   text not null check (length(btrim(conteudo)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists lead_interacoes_lead_idx on public.lead_interacoes (lead_id, created_at desc);

alter table public.lead_interacoes enable row level security;

-- Histórico é append-only por design de produto (US01, edge case): sem
-- policy de update/delete, só select+insert para admin.
create policy lead_interacoes_admin_read on public.lead_interacoes for select
  using (public.is_admin());
create policy lead_interacoes_admin_insert on public.lead_interacoes for insert
  with check (public.is_admin() and autor_id = auth.uid());

-- E-mail do admin não é legível via RLS (mora em auth.users) — expõe só o
-- necessário para o seletor de responsável no painel, gated por is_admin().
create or replace function public.listar_admins()
returns table (user_id uuid, email text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select a.user_id, u.email
  from public.admins a
  join auth.users u on u.id = a.user_id
  where public.is_admin()
  order by u.email;
$$;

revoke all on function public.listar_admins() from public, anon;
grant execute on function public.listar_admins() to authenticated;
