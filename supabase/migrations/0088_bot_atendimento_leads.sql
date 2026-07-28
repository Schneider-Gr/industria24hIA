-- Bot de atendimento (site + WhatsApp): conversas, mensagens e leads comerciais.

create table if not exists public.bot_conversas (
  id             uuid primary key default gen_random_uuid(),
  canal          text not null check (canal in ('site', 'whatsapp')),
  usuario_id     uuid references auth.users (id) on delete set null,
  telefone       text,
  identificado_em timestamptz,
  status         text not null default 'aberta' check (status in ('aberta', 'escalada', 'encerrada')),
  jira_issue_key text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists bot_conversas_telefone_idx on public.bot_conversas (telefone) where telefone is not null;
create index if not exists bot_conversas_usuario_idx on public.bot_conversas (usuario_id) where usuario_id is not null;

create table if not exists public.bot_mensagens (
  id          uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.bot_conversas (id) on delete cascade,
  remetente   text not null check (remetente in ('usuario', 'bot')),
  conteudo    text not null check (length(btrim(conteudo)) between 1 and 4000),
  created_at  timestamptz not null default now()
);

create index if not exists bot_mensagens_conversa_idx on public.bot_mensagens (conversa_id, created_at);

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  conversa_id uuid references public.bot_conversas (id) on delete set null,
  nome        text,
  contato     text not null,
  interesse   text,
  status      text not null default 'novo' check (status in ('novo', 'em_contato', 'convertido', 'descartado')),
  created_at  timestamptz not null default now()
);

create index if not exists leads_status_idx on public.leads (status, created_at desc);

-- Identidade no WhatsApp: só por e-mail cadastrado (CPF fica espalhado em
-- tabelas de checkout/parceiro sem um cadastro central — email via
-- auth.users é a única correspondência confiável hoje). security definer
-- porque auth.users não é legível por client comum.
create or replace function public.resolver_usuario_por_contato(p_contato text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(btrim(p_contato)) limit 1;
$$;

revoke all on function public.resolver_usuario_por_contato(text) from public, anon, authenticated;

alter table public.bot_conversas enable row level security;
alter table public.bot_mensagens enable row level security;
alter table public.leads enable row level security;

-- Widget/webhook falam com o banco via service role (mesmo padrão do webhook
-- Asaas): nenhuma policy authenticated/anon aqui, só leitura de admin.
create policy bot_conversas_admin_read on public.bot_conversas for select
  using (public.is_admin());
create policy bot_mensagens_admin_read on public.bot_mensagens for select
  using (public.is_admin());
create policy leads_admin_all on public.leads for all
  using (public.is_admin()) with check (public.is_admin());
