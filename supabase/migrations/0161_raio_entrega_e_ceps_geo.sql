-- PRD 026 — filtro de vitrine por raio de entrega.
--
-- 1) `ceps_geo`: cache de CEP → coordenada. Gravar aqui custa uma chamada paga
--    da Geocoding API, por isso a escrita é só do service_role; a leitura é
--    pública porque a vitrine anônima precisa dela a cada render.
-- 2) `produtos.raio_entrega_km`: alcance de entrega POR PRODUTO (decisão de
--    04/09 — não há coluna equivalente em `lojas`). NULL = sem limite de raio,
--    que é o estado de todos os produtos existentes: a migration não muda o
--    que hoje aparece na vitrine.

create table if not exists public.ceps_geo (
  cep text primary key check (cep ~ '^[0-9]{8}$'),
  lat double precision not null,
  lon double precision not null,
  cidade text,
  uf text,
  fonte text not null default 'google',
  atualizado_em timestamptz not null default now()
);

alter table public.ceps_geo enable row level security;

drop policy if exists ceps_geo_read on public.ceps_geo;
create policy ceps_geo_read on public.ceps_geo
  for select using (true);

-- Sem policy de insert/update/delete: service_role ignora RLS, todo o resto
-- fica só com leitura. Cache não é dado de usuário, não há PII aqui.

alter table public.produtos
  add column if not exists raio_entrega_km integer
  check (raio_entrega_km is null or raio_entrega_km > 0);

comment on column public.produtos.raio_entrega_km is
  'Raio de entrega em km a partir do CEP do produto (ou da loja, se o produto não tiver). NULL = sem limite.';

notify pgrst, 'reload schema';
