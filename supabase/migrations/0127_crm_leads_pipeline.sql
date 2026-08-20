-- CRM de leads fase 1 (issue #141, mapa #124). Evolui `leads`/`lead_interacoes`
-- (0088/0091) em vez de criar sistema paralelo, como definido na spec.
--
-- Decisões tomadas nesta migration por default documentado (issues #125,
-- #126 e #132 do mapa seguem abertas sem resposta na data desta migration):
--  - #126 (estágios do pipeline): mantidos os 4 status atuais
--    (novo/em_contato/convertido/descartado) — nenhuma coluna nova de
--    estágio. Se o ticket fechar com estágios adicionais, é migration aditiva.
--  - #125 (dono do seller): lead ganha `loja_id` opcional; seller enxerga via
--    RLS quando o lead está vinculado a uma loja dele. Lead sem loja
--    (ex.: vindo do bot geral) continua visível só a admin, que atribui
--    manualmente via `responsavel_id` (já existente) — default "atribuição
--    manual por admin" citado na spec para o que não tem regra fechada.
--  - #132 (shape multi-fonte): `fonte` nasce com 3 valores (bot_site,
--    whatsapp, manual — cobrindo Instagram por registro manual, conforme
--    spec). Carrinho abandonado fica de fora até o ticket #127 fechar; o
--    check é extensível por migration aditiva.

alter table public.leads
  add column if not exists fonte text not null default 'bot_site'
    check (fonte in ('bot_site', 'whatsapp', 'manual')),
  add column if not exists loja_id uuid references public.lojas (id) on delete set null,
  add column if not exists score text check (score in ('quente', 'morno', 'frio')),
  add column if not exists resumo_ia text,
  add column if not exists scored_at timestamptz,
  add column if not exists whatsapp_optin_at timestamptz,
  add column if not exists whatsapp_optin_texto text;

create index if not exists leads_fonte_idx on public.leads (fonte);
create index if not exists leads_loja_idx on public.leads (loja_id) where loja_id is not null;

-- Seller vê os leads da(s) loja(s) dele, além da policy admin-all já
-- existente (0088) — RLS soma policies de select com OR.
create policy leads_seller_read on public.leads for select
  using (exists (select 1 from public.lojas l where l.id = leads.loja_id and l.owner_id = auth.uid()));

-- Dedupe (US18): busca por telefone normalizado (só dígitos) OU e-mail
-- exato antes de criar lead novo. Sem colunas normalizadas extras — compara
-- em tempo de consulta, contato já é baixo volume (leads, não pedidos).
create or replace function public.buscar_lead_duplicado(p_contato text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.leads
  where public.is_admin()
    and (
      (regexp_replace(contato, '\D', '', 'g') <> ''
        and regexp_replace(contato, '\D', '', 'g') = regexp_replace(p_contato, '\D', '', 'g'))
      or lower(btrim(contato)) = lower(btrim(p_contato))
    )
  order by created_at desc
  limit 1;
$$;

revoke all on function public.buscar_lead_duplicado(text) from public, anon;
grant execute on function public.buscar_lead_duplicado(text) to authenticated;

-- Opt-in de WhatsApp (US14): só admin registra, texto exibido fica
-- auditável. Sem opt-in, o follow-up de WhatsApp fica bloqueado na UI.
create or replace function public.registrar_optin_whatsapp(p_lead_id uuid, p_texto text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.leads
  set whatsapp_optin_at = now(), whatsapp_optin_texto = p_texto
  where id = p_lead_id and public.is_admin();
$$;

revoke all on function public.registrar_optin_whatsapp(uuid, text) from public, anon;
grant execute on function public.registrar_optin_whatsapp(uuid, text) to authenticated;

-- Auditoria de follow-up (US13): 1 linha por envio, nunca editável.
create table if not exists public.lead_followups (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on delete cascade,
  canal       text not null check (canal in ('whatsapp')),
  template    text not null,
  enviado_por uuid not null references public.admins (user_id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists lead_followups_lead_idx on public.lead_followups (lead_id, created_at desc);

alter table public.lead_followups enable row level security;

create policy lead_followups_admin_read on public.lead_followups for select
  using (public.is_admin());
create policy lead_followups_admin_insert on public.lead_followups for insert
  with check (public.is_admin() and enviado_por = auth.uid());
