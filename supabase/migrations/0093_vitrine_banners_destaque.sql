-- Banners editáveis da faixa "Destaques da Indústria" no topo da home
-- (BannerGalerias em src/app/page.tsx), hoje hardcoded no array CARDS_GALERIA.
-- Imagem sobe pro bucket 'marketplace' já existente (migration 0056),
-- prefixo 'destaques', mesma policy admin-write que o banner do topo usa.

create table if not exists banners_destaque (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  imagem_url text not null,
  href text not null,
  badge text,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table banners_destaque enable row level security;

-- Leitura pública: qualquer visitante da home lê os banners ativos.
create policy "banners_destaque_select_public"
  on banners_destaque for select
  using (ativo = true);

-- Escrita: só admin (mesmo padrão is_admin() de vitrine_galerias/0092).
create policy "banners_destaque_admin_all"
  on banners_destaque for all
  using (is_admin())
  with check (is_admin());
