-- CMS de páginas institucionais (QUEM SOMOS, termos, política...).
-- Leitura pública (páginas são exibidas no site); escrita só admin (is_admin()).

create table if not exists public.paginas_cms (
  slug          text primary key,
  titulo        text not null,
  conteudo_rich text not null default '',
  atualizado_em timestamptz not null default now()
);

alter table public.paginas_cms enable row level security;

drop policy if exists paginas_cms_read on public.paginas_cms;
create policy paginas_cms_read on public.paginas_cms
  for select using (true);
drop policy if exists paginas_cms_admin_write on public.paginas_cms;
create policy paginas_cms_admin_write on public.paginas_cms
  for all using (public.is_admin()) with check (public.is_admin());
