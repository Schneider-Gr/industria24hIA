-- Avaliação de produto pelo comprador (nota 1-5 + comentário opcional).
-- Pedido explícito do dono em sessão de redesign mobile — gap já registrado
-- em docs/prd (não existia sistema de avaliação de produto no schema).
-- Um usuário avalia um produto uma única vez (par único); pode editar depois
-- (upsert), não pode avaliar duas vezes.

create table if not exists public.avaliacoes_produto (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  produto_id  uuid not null references public.produtos (id) on delete cascade,
  nota        smallint not null check (nota between 1 and 5),
  comentario  text,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (user_id, produto_id)
);

create index if not exists avaliacoes_produto_produto_idx on public.avaliacoes_produto (produto_id);

alter table public.avaliacoes_produto enable row level security;

-- Nasce sem policy (regra 8 do CLAUDE.md).
-- Leitura pública: avaliação de produto é conteúdo de vitrine, não dado
-- pessoal (mesmo padrão de review de e-commerce — nome do avaliador não é
-- exposto por esta tabela, só o texto/nota).
create policy avaliacoes_produto_leitura_publica on public.avaliacoes_produto
  for select
  using (true);

-- Escrita/edição só pelo próprio autor.
create policy avaliacoes_produto_escreve_dono on public.avaliacoes_produto
  for insert
  with check (auth.uid() = user_id);

create policy avaliacoes_produto_edita_dono on public.avaliacoes_produto
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy avaliacoes_produto_apaga_dono on public.avaliacoes_produto
  for delete
  using (auth.uid() = user_id);

-- Média + contagem agregada por produto, para o card/PDP não calcular no
-- client toda vez.
create or replace view public.avaliacoes_produto_resumo as
  select
    produto_id,
    round(avg(nota)::numeric, 1) as media,
    count(*)::int as total
  from public.avaliacoes_produto
  group by produto_id;

grant select on public.avaliacoes_produto_resumo to anon, authenticated;
