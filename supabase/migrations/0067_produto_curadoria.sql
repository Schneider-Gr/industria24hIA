-- Curadoria de produto: histórico dos pareceres do admin.
--
-- Hoje a moderação só grava `produtos.status_produto` (0002), sem registro de
-- QUEM decidiu, QUANDO e POR QUÊ — o seller recebe "Recusado" sem motivo e o
-- admin não consegue auditar a própria decisão. Esta tabela é append-only: o
-- status continua sendo a fonte de verdade do estado atual; aqui fica a trilha.

create table if not exists public.produto_curadoria (
  id          uuid primary key default gen_random_uuid(),
  produto_id  uuid not null references public.produtos(id) on delete cascade,
  admin_id    uuid not null default auth.uid() references auth.users(id),
  decisao     text not null check (decisao in ('aprovado', 'reprovado', 'sugestao')),
  observacao  text,
  created_at  timestamptz not null default now()
);

create index if not exists produto_curadoria_produto_idx
  on public.produto_curadoria (produto_id, created_at desc);

alter table public.produto_curadoria enable row level security;

-- Admin escreve e lê tudo; seller lê só a curadoria dos produtos da própria loja
-- (é o parecer que ele precisa ver pra corrigir o anúncio).
create policy produto_curadoria_admin_all on public.produto_curadoria for all
  using (public.is_admin()) with check (public.is_admin());

create policy produto_curadoria_seller_read on public.produto_curadoria for select
  using (
    exists (
      select 1
      from public.produtos p
      join public.lojas l on l.id = p.loja_id
      where p.id = produto_curadoria.produto_id
        and l.owner_id = auth.uid()
    )
  );
