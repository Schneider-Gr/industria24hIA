-- Sugestões de curadoria geradas por agente de IA (CrewAI): descrição e
-- fotos revisadas de loja/produto, para o admin aprovar ou descartar em
-- /admin/produtos/[id] antes de aplicar. Nunca escreve direto em `produtos`
-- ou `lojas` — só o admin aplica, via ação humana.

create table if not exists public.produto_sugestoes_ia (
  id           uuid primary key default gen_random_uuid(),
  produto_id   uuid not null references public.produtos(id) on delete cascade,
  tipo         text not null check (tipo in ('descricao', 'imagem', 'dados_loja')),
  conteudo     text not null,
  motivo       text,
  status       text not null default 'pendente' check (status in ('pendente', 'aplicada', 'descartada')),
  criado_por   text not null default 'crewai',
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  uuid references auth.users(id)
);

create index if not exists produto_sugestoes_ia_produto_idx
  on public.produto_sugestoes_ia (produto_id, status, created_at desc);

alter table public.produto_sugestoes_ia enable row level security;

-- Só admin lê/decide. A escrita do agente entra por service_role (bypassa RLS),
-- nunca pela chave anon/pública.
create policy produto_sugestoes_ia_admin_all on public.produto_sugestoes_ia for all
  using (public.is_admin()) with check (public.is_admin());
