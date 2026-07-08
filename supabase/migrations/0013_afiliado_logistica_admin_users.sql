-- Painel do afiliado logístico + listagem de usuários no admin.
-- 1) afiliacoes.tipo — o Bubble tem DOIS tipos de relação afiliado↔loja:
--    Relacao_Afiliado_Loja ('vendas', 51 registros migrados) e
--    Relacao_Afiliado.transporte_Loja ('logistica', página `afiliadologistica`).
--    Mapeamento documentado em docs/database.md; registros migrados ficam 'vendas'.
-- 2) Afiliado logístico APROVADO lê pedidos/itens das lojas afiliadas e
--    opera o estado de entrega (mesma tabela `entregas` do admin, 0009).
-- 3) admin_list_users(): tela /admin/usuarios lista o auth via security definer
--    guardado por is_admin() (sem service_role no app — regra do projeto).

alter table public.afiliacoes
  add column if not exists tipo text not null default 'vendas'
  check (tipo in ('vendas','logistica'));

-- helper reutilizado pelas 3 policies abaixo (STABLE, roda com RLS do chamador
-- em afiliacoes — o afiliado lê as próprias afiliações desde 0011).
create or replace function public.eh_afiliado_logistica(p_loja uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.afiliacoes a
    where a.loja_id = p_loja
      and a.afiliado_id = auth.uid()
      and a.tipo = 'logistica'
      and a.status = 'Aprovada'
  );
$$;

create policy pedidos_logistica_read on public.pedidos for select
  using (public.eh_afiliado_logistica(loja_id));

create policy linha_itens_logistica_read on public.linha_itens for select
  using (exists (
    select 1 from public.pedidos pe
    where pe.id = pedido_id and public.eh_afiliado_logistica(pe.loja_id)
  ));

-- entregas é 1:1 com linha_itens; upsert = insert + update.
create policy entregas_logistica_select on public.entregas for select
  using (exists (
    select 1 from public.linha_itens li
    join public.pedidos pe on pe.id = li.pedido_id
    where li.id = linha_item_id and public.eh_afiliado_logistica(pe.loja_id)
  ));

create policy entregas_logistica_insert on public.entregas for insert
  with check (exists (
    select 1 from public.linha_itens li
    join public.pedidos pe on pe.id = li.pedido_id
    where li.id = linha_item_id and public.eh_afiliado_logistica(pe.loja_id)
  ));

create policy entregas_logistica_update on public.entregas for update
  using (exists (
    select 1 from public.linha_itens li
    join public.pedidos pe on pe.id = li.pedido_id
    where li.id = linha_item_id and public.eh_afiliado_logistica(pe.loja_id)
  ))
  with check (exists (
    select 1 from public.linha_itens li
    join public.pedidos pe on pe.id = li.pedido_id
    where li.id = linha_item_id and public.eh_afiliado_logistica(pe.loja_id)
  ));

-- ============ Admin: listagem de usuários ============
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  criado_em timestamptz,
  ultimo_login timestamptz,
  eh_admin boolean,
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
    (select l.nome from public.lojas l where l.owner_id = u.id limit 1)
  from auth.users u
  where public.is_admin()  -- não-admin recebe conjunto vazio
  order by u.created_at desc
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
