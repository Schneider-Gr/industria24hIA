-- Favoritos do comprador: um produto pode ser favoritado por vários
-- usuários, um usuário pode favoritar vários produtos (par único). Pedido
-- explícito do dono em sessão de redesign mobile — antes não existia essa
-- tabela (o botão de coração na galeria era decorativo/desabilitado).

create table if not exists public.favoritos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  produto_id  uuid not null references public.produtos (id) on delete cascade,
  criado_em   timestamptz not null default now(),
  unique (user_id, produto_id)
);

create index if not exists favoritos_user_idx on public.favoritos (user_id);
create index if not exists favoritos_produto_idx on public.favoritos (produto_id);

alter table public.favoritos enable row level security;

-- Nasce sem policy (regra 8 do CLAUDE.md); libera só o dono do favorito.
create policy favoritos_dono on public.favoritos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Contagem de favoritos por produto é pública (mostrar "N favoritaram"),
-- mas não expõe QUEM favoritou — view sem RLS de linha, só agregação.
create or replace view public.favoritos_contagem as
  select produto_id, count(*)::int as total
  from public.favoritos
  group by produto_id;

grant select on public.favoritos_contagem to anon, authenticated;
