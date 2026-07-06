-- Admin cross-seller — tabela `admins` + is_admin() + policies.
-- No Bubble o admin é a conta da dona (andreiaschneider); aqui o papel vive
-- numa tabela própria (não em app_metadata) para ser auditável e revogável
-- por SQL. Inserir admins só via service_role (sem policy de insert).

create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Cada um pode checar se ELE é admin (gate do layout /admin).
create policy admins_self_read on public.admins for select
  using (user_id = auth.uid());

-- security definer: usável dentro de policies de outras tabelas sem recursão.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Admin lê e escreve tudo nas tabelas do marketplace (menus reais do painel
-- /admin: Usuários, Afiliados, Produtos, Lojas, Categorias, Promoções,
-- Pedidos, Entregas — ver docs/admin-module.md).
create policy categorias_admin_all on public.categorias for all
  using (public.is_admin()) with check (public.is_admin());
create policy subcategorias_admin_all on public.subcategorias for all
  using (public.is_admin()) with check (public.is_admin());
create policy lojas_admin_all on public.lojas for all
  using (public.is_admin()) with check (public.is_admin());
create policy centros_admin_all on public.centros_distribuicao for all
  using (public.is_admin()) with check (public.is_admin());
create policy produtos_admin_all on public.produtos for all
  using (public.is_admin()) with check (public.is_admin());
create policy produto_imagens_admin_all on public.produto_imagens for all
  using (public.is_admin()) with check (public.is_admin());
create policy produto_centros_admin_all on public.produto_centros for all
  using (public.is_admin()) with check (public.is_admin());
create policy afiliacoes_admin_all on public.afiliacoes for all
  using (public.is_admin()) with check (public.is_admin());
create policy vendas_futuras_admin_all on public.vendas_futuras for all
  using (public.is_admin()) with check (public.is_admin());
create policy promocoes_admin_all on public.promocoes_progressivas for all
  using (public.is_admin()) with check (public.is_admin());
create policy pedidos_admin_all on public.pedidos for all
  using (public.is_admin()) with check (public.is_admin());
create policy linha_itens_admin_all on public.linha_itens for all
  using (public.is_admin()) with check (public.is_admin());
create policy acessos_admin_read on public.acessos for select
  using (public.is_admin());
