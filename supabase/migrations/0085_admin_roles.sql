-- Níveis de admin (super-admin/moderador/financeiro). Escopo confirmado com
-- o dono (25/07): só rótulo + gate na aplicação — RLS continua tratando
-- qualquer linha em `admins` como admin pleno (is_admin() não muda), sem
-- reescrever as ~15 policies existentes. Granularidade real de RLS por role
-- é decisão futura separada, fora deste escopo.

alter table public.admins
  add column if not exists role text not null default 'super_admin'
  check (role in ('super_admin', 'moderador', 'financeiro'));

-- Todo admin já existente vira super_admin (é o nível de acesso real que já
-- têm hoje — rebaixar retroativamente seria regressão silenciosa de acesso).

create or replace function public.has_role(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid() and role = any(p_roles)
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid() and role = 'super_admin'
  );
$$;

revoke all on function public.has_role(text[]) from public, anon;
grant execute on function public.has_role(text[]) to authenticated;
revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

-- admin_list_users() passa a expor o role (0015 original só tinha eh_admin
-- boolean) — muda o tipo de retorno, então precisa DROP antes do CREATE
-- (grants/revokes reaplicados abaixo).
drop function if exists public.admin_list_users();

create function public.admin_list_users()
returns table (
  id uuid,
  email text,
  criado_em timestamptz,
  ultimo_login timestamptz,
  eh_admin boolean,
  role text,
  loja_nome text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    exists (select 1 from public.admins a where a.user_id = u.id),
    (select a.role from public.admins a where a.user_id = u.id),
    (select l.nome from public.lojas l where l.owner_id = u.id limit 1)
  from auth.users u
  where public.is_admin()  -- não-admin recebe conjunto vazio
  order by u.created_at desc
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- Promove/rebaixa um admin. Só super_admin pode chamar. Auditado.
create or replace function public.admin_definir_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Apenas super-admin.';
  end if;
  if p_role not in ('super_admin', 'moderador', 'financeiro') then
    raise exception 'Role inválido.';
  end if;

  insert into public.admins (user_id, role)
  values (p_user_id, p_role)
  on conflict (user_id) do update set role = excluded.role;

  insert into public.auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (auth.uid(), 'admin', 'admin.role_alterada', 'admins', p_user_id,
          jsonb_build_object('role', p_role));
end;
$$;

revoke all on function public.admin_definir_role(uuid, text) from public, anon;
grant execute on function public.admin_definir_role(uuid, text) to authenticated;
