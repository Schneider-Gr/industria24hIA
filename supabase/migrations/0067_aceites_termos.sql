-- Aceite de termos por USUÁRIO (opt-in na primeira entrada nos painéis de
-- seller e de afiliado). O aceite que já existia é por afiliação
-- (afiliacoes.termos_aceitos_em, migration 0060) e por pedido
-- (pedidos.termos_aceitos_em, 0061); nenhum dos dois cobre "entrou no painel
-- pela primeira vez".
--
-- Guarda a versão aceita (atualizado_em da página CMS no momento do aceite):
-- juridicamente importa QUAL texto a pessoa leu, não só a data.
-- Numeração: criada como 0064, renumerada para 0067 em 21/07 — uma sessão
-- paralela publicou 0064_produto_curadoria.sql com o mesmo número, e a
-- duplicidade quebrava o CI de todos os PRs. As duas tabelas já existem no
-- banco; o `create table if not exists` torna a renumeração inócua lá.

create table if not exists public.aceites_termos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  slug       text not null references public.paginas_cms (slug) on update cascade,
  versao     text,
  aceito_em  timestamptz not null default now(),
  unique (user_id, slug)
);

create index if not exists aceites_termos_user_idx on public.aceites_termos (user_id);

alter table public.aceites_termos enable row level security;

-- Cada usuário lê e grava apenas o próprio aceite. Sem update e sem delete:
-- aceite é registro histórico, não é editável pelo titular.
drop policy if exists aceites_termos_select_proprio on public.aceites_termos;
create policy aceites_termos_select_proprio
  on public.aceites_termos for select
  using (user_id = auth.uid());

drop policy if exists aceites_termos_insert_proprio on public.aceites_termos;
create policy aceites_termos_insert_proprio
  on public.aceites_termos for insert
  with check (user_id = auth.uid());
