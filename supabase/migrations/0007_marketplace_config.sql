-- Config visual da home (banners). Tabela singleton: uma linha fixa (id=1).
-- Leitura pública (a home renderiza os banners); escrita só admin (is_admin()).

create table if not exists public.marketplace_config (
  id                 smallint primary key default 1 check (id = 1),
  banner_desktop_url text,
  banner_mobile_url  text,
  atualizado_em      timestamptz not null default now()
);

insert into public.marketplace_config (id) values (1) on conflict do nothing;

alter table public.marketplace_config enable row level security;

drop policy if exists marketplace_config_read on public.marketplace_config;
create policy marketplace_config_read on public.marketplace_config
  for select using (true);
drop policy if exists marketplace_config_admin_write on public.marketplace_config;
create policy marketplace_config_admin_write on public.marketplace_config
  for all using (public.is_admin()) with check (public.is_admin());
