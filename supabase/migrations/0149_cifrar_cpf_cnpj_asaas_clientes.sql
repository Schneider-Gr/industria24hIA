-- 0149: cifra o CPF/CNPJ em asaas_clientes (achado #10 da auditoria OWASP).
--
-- Coluna que estava em texto puro, lida hoje só pela RLS `asaas_clientes_self`
-- (usuário lê a própria linha) — nenhuma leitura no app TS (grep confirmado,
-- só INSERT/UPSERT em checkout/actions.ts). Chave de cifragem já criada no
-- Supabase Vault fora desta migration (`cpf_cnpj_encryption_key`) — nunca
-- versionar a chave em texto puro.
--
-- Já aplicada manualmente em produção em 2026-08-25 (5/5 registros cifrados);
-- esta migration registra a mudança no histórico versionado. É idempotente
-- (`if not exists` / `create or replace` / `drop ... if exists`), então
-- reaplicar em prod é no-op.

create extension if not exists pgcrypto with schema extensions;

alter table public.asaas_clientes add column if not exists cpf_cnpj_enc bytea;

create or replace function public.cpf_cnpj_encryption_key()
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'cpf_cnpj_encryption_key' limit 1;
$$;
revoke all on function public.cpf_cnpj_encryption_key() from public, anon, authenticated;
grant execute on function public.cpf_cnpj_encryption_key() to service_role;

-- Guard: sem o secret no Vault a cifragem geraria pgp_sym_encrypt(texto, NULL)
-- e o backfill abaixo falharia no meio. Aborta cedo com mensagem clara.
do $$
begin
  if public.cpf_cnpj_encryption_key() is null then
    raise exception 'Secret "cpf_cnpj_encryption_key" ausente no Vault. Crie-o antes de aplicar esta migration.';
  end if;
end;
$$;

-- Cifra automaticamente em todo insert/update e zera a coluna texto —
-- o app continua fazendo upsert com cpf_cnpj em claro (não precisa mudar
-- código), o trigger é quem garante que nada em claro sobrevive na linha.
create or replace function public.asaas_clientes_cifrar_cpf_cnpj()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.cpf_cnpj is not null and new.cpf_cnpj <> '' then
    new.cpf_cnpj_enc := pgp_sym_encrypt(new.cpf_cnpj, public.cpf_cnpj_encryption_key());
    new.cpf_cnpj := '';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_asaas_clientes_cifrar_cpf_cnpj on public.asaas_clientes;
create trigger trg_asaas_clientes_cifrar_cpf_cnpj
before insert or update on public.asaas_clientes
for each row execute function public.asaas_clientes_cifrar_cpf_cnpj();

-- Decifra sob demanda, só para service_role (uso futuro: suporte/admin).
create or replace function public.asaas_cliente_cpf_cnpj_decifrado(p_user_id uuid)
returns text
language sql
security definer
set search_path = public, extensions
as $$
  select pgp_sym_decrypt(cpf_cnpj_enc, public.cpf_cnpj_encryption_key())
  from public.asaas_clientes where user_id = p_user_id;
$$;
revoke all on function public.asaas_cliente_cpf_cnpj_decifrado(uuid) from public, anon, authenticated;
grant execute on function public.asaas_cliente_cpf_cnpj_decifrado(uuid) to service_role;

-- Migra linhas existentes: um update "no-op" no valor dispara o trigger de
-- cifragem em cima dos dados já gravados.
update public.asaas_clientes set cpf_cnpj = cpf_cnpj where cpf_cnpj <> '';
