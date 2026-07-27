-- Expõe banned_until em admin_list_users() pra UI saber quem já está banido
-- (ban/desban via Admin API, migration do código na Fase 5). Muda o tipo de
-- retorno — precisa DROP antes do CREATE (grants reaplicados abaixo).
drop function if exists public.admin_list_users();

create function public.admin_list_users()
returns table (
  id uuid,
  email text,
  criado_em timestamptz,
  ultimo_login timestamptz,
  eh_admin boolean,
  role text,
  loja_nome text,
  banned_until timestamptz
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
    (select l.nome from public.lojas l where l.owner_id = u.id limit 1),
    u.banned_until
  from auth.users u
  where public.is_admin()  -- não-admin recebe conjunto vazio
  order by u.created_at desc
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
