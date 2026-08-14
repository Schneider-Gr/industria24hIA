-- Vitrine curada do afiliado: coleção nomeada de produtos já afiliados,
-- publicada como página pública por slug. Ver openspec/changes/afiliado-selecao-vitrine.

create table if not exists afiliado_vitrines (
  id uuid primary key default gen_random_uuid(),
  afiliado_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  slug text not null unique,
  criado_em timestamptz not null default now()
);

create index if not exists afiliado_vitrines_afiliado_id_idx on afiliado_vitrines (afiliado_id);

alter table afiliado_vitrines enable row level security;

-- Leitura pública só pelo slug (página de divulgação, sem login) — nunca listagem geral.
create policy afiliado_vitrines_select_publico on afiliado_vitrines
  for select
  using (true);

create policy afiliado_vitrines_dono_all on afiliado_vitrines
  for all
  using (afiliado_id = auth.uid())
  with check (afiliado_id = auth.uid());
