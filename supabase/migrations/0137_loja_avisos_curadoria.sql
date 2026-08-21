-- Avisos de curadoria de loja gerados por IA (agente LangSmith "Curadoria de
-- seller"): dados cadastrais faltantes (CNPJ, endereço, contato, chave PIX)
-- com dica de preenchimento. Puramente informativo para o seller em
-- /seller/minha-loja — nunca bloqueia o cadastro nem altera `lojas`.

create table if not exists public.loja_avisos_curadoria (
  id           uuid primary key default gen_random_uuid(),
  loja_id      uuid not null references public.lojas(id) on delete cascade,
  campo        text not null,
  mensagem     text not null,
  status       text not null default 'pendente' check (status in ('pendente', 'resolvido', 'descartado')),
  criado_por   text not null default 'langsmith-curadoria',
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references auth.users(id)
);

create index if not exists loja_avisos_curadoria_loja_idx
  on public.loja_avisos_curadoria (loja_id, status, created_at desc);

alter table public.loja_avisos_curadoria enable row level security;

-- Seller só vê/resolve avisos da própria loja; escrita (insert) é sempre via
-- service_role (bypassa RLS), mesmo padrão de produto_sugestoes_ia — deny by
-- default cobre insert/delete do seller, sem policy dedicada.
create policy loja_avisos_curadoria_seller_select on public.loja_avisos_curadoria for select
  using (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()));

create policy loja_avisos_curadoria_seller_update on public.loja_avisos_curadoria for update
  using (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()));

create policy loja_avisos_curadoria_admin_all on public.loja_avisos_curadoria for all
  using (public.is_admin()) with check (public.is_admin());
