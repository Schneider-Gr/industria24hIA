-- Galerias de banner editáveis no admin (Lançamento, Mais Baratos, Desconto
-- Progressivo, custom). "Lançamento" e "Mais Baratos" são calculados
-- dinamicamente pela aplicação (produto mais recente / mais barato, filtrado
-- por cobertura de CEP) — vitrine_galeria_produtos só é usada para tipo
-- 'custom', onde o admin cura manualmente quais produtos aparecem.

create table if not exists vitrine_galerias (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('lancamento', 'mais_baratos', 'desconto_progressivo', 'custom')),
  titulo text not null,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists vitrine_galeria_produtos (
  id uuid primary key default gen_random_uuid(),
  galeria_id uuid not null references vitrine_galerias(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  ordem int not null default 0,
  unique (galeria_id, produto_id)
);

alter table vitrine_galerias enable row level security;
alter table vitrine_galeria_produtos enable row level security;

-- Leitura pública: qualquer visitante da vitrine pode ler galerias ativas.
create policy "vitrine_galerias_select_public"
  on vitrine_galerias for select
  using (ativo = true);

create policy "vitrine_galeria_produtos_select_public"
  on vitrine_galeria_produtos for select
  using (
    exists (
      select 1 from vitrine_galerias g
      where g.id = vitrine_galeria_produtos.galeria_id and g.ativo = true
    )
  );

-- Escrita: só admin (mesmo padrão de is_admin() já usado em outras tabelas
-- administrativas do projeto, ex. admin_roles/0085).
create policy "vitrine_galerias_admin_all"
  on vitrine_galerias for all
  using (is_admin())
  with check (is_admin());

create policy "vitrine_galeria_produtos_admin_all"
  on vitrine_galeria_produtos for all
  using (is_admin())
  with check (is_admin());
