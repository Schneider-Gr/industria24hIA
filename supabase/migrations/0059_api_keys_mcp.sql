-- 0059: camada de credenciais para integração de terceiros via MCP.
-- Não existia tabela de tokens no schema (integração era só service_role em .env).
-- Modelo: cada parceiro tem 1+ chaves; cada chave tem UM escopo (read|write) e é
-- amarrada a UMA loja (loja_id) — a escrita de terceiro nunca sai da loja dona.
-- O token em claro NUNCA é gravado: guardamos só o SHA-256 (token_hash). A leitura
-- é liberada com escopo 'read'; para editar exige-se uma chave separada de escopo
-- 'write', emitida só após aprovação do admin (aprovada_por/aprovada_em).
-- RLS deny-by-default (regra 8): nada é legível pelo client; o servidor MCP usa
-- service_role e as RPCs abaixo (security definer) centralizam validação/auditoria.

-- ============ Parceiro ============
create table public.api_partners (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  contato     text,                    -- email/whatsapp do responsável
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- ============ Chaves ============
create table public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  partner_id   uuid not null references public.api_partners (id) on delete cascade,
  loja_id      uuid not null references public.lojas (id) on delete cascade,
  token_hash   text not null unique,   -- SHA-256 hex do token em claro
  prefixo      text not null,          -- ex 'i24_read_a1b2' — só telemetria, não é segredo
  escopo       text not null check (escopo in ('read','write')),
  -- Escopo 'write' só vale depois de aprovado por um admin.
  aprovada_por uuid references auth.users (id) on delete set null,
  aprovada_em  timestamptz,
  revogada_em  timestamptz,
  expira_em    timestamptz,
  ultimo_uso   timestamptz,
  criado_em    timestamptz not null default now()
);

create index api_keys_partner_idx on public.api_keys (partner_id);
create index api_keys_loja_idx on public.api_keys (loja_id);

-- ============ Auditoria de uso da API ============
create table public.api_audit_log (
  id            uuid primary key default gen_random_uuid(),
  key_id        uuid references public.api_keys (id) on delete set null,
  loja_id       uuid,
  tool          text not null,
  params_resumo jsonb,
  ok            boolean not null,
  erro          text,
  ip            text,
  criado_em     timestamptz not null default now()
);

create index api_audit_log_key_idx on public.api_audit_log (key_id);
create index api_audit_log_criado_idx on public.api_audit_log (criado_em desc);

-- ============ RLS: deny-by-default ============
alter table public.api_partners enable row level security;
alter table public.api_keys     enable row level security;
alter table public.api_audit_log enable row level security;

-- Só admin lê/gerencia (emissão inicial é via SQL/admin; UI vem depois).
create policy api_partners_admin_all on public.api_partners
  for all using (public.is_admin()) with check (public.is_admin());
create policy api_keys_admin_all on public.api_keys
  for all using (public.is_admin()) with check (public.is_admin());
create policy api_audit_log_admin_read on public.api_audit_log
  for select using (public.is_admin());
-- Sem policy de insert/select para authenticated: o servidor MCP entra por
-- service_role (bypassa RLS) e só através das RPCs abaixo.

-- ============ Validação de token (security definer) ============
-- Recebe o hash do token e o escopo mínimo exigido pela tool. Devolve a linha
-- utilizável (key_id, loja_id, escopo) só se: parceiro ativo, chave não revogada,
-- não expirada, e — quando exige 'write' — chave de escopo write E aprovada.
-- 'read' é atendido tanto por chave read quanto por write (write inclui leitura).
create or replace function public.api_validar_token(p_token_hash text, p_escopo text)
returns table (key_id uuid, loja_id uuid, escopo text)
language sql
security definer
set search_path = public
as $$
  select k.id, k.loja_id, k.escopo
  from public.api_keys k
  join public.api_partners p on p.id = k.partner_id
  where k.token_hash = p_token_hash
    and p.ativo
    and k.revogada_em is null
    and (k.expira_em is null or k.expira_em > now())
    and (
      p_escopo = 'read'
      or (k.escopo = 'write' and k.aprovada_em is not null)
    )
  limit 1;
$$;

-- Registra uso + carimba ultimo_uso. Sempre chamada pelo servidor (service_role).
create or replace function public.api_registrar_uso(
  p_key_id uuid, p_loja_id uuid, p_tool text,
  p_params jsonb, p_ok boolean, p_erro text, p_ip text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.api_audit_log (key_id, loja_id, tool, params_resumo, ok, erro, ip)
  values (p_key_id, p_loja_id, p_tool, p_params, p_ok, p_erro, p_ip);
  update public.api_keys set ultimo_uso = now() where id = p_key_id;
end;
$$;
