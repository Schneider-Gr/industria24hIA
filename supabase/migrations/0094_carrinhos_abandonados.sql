-- Carrinho abandonado: hoje o carrinho só existe em localStorage, invisível
-- ao servidor. Esta tabela é o espelho server-side (sync a cada mudança,
-- ver src/app/api/carrinho/sync) que o job de varredura (src/app/api/
-- carrinho/abandono/tick) usa para saber quem tem itens parados há 1h e
-- ainda não recebeu o lembrete.

create table if not exists public.carrinhos_abandonados (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  email               text not null,
  itens               jsonb not null default '[]'::jsonb,
  atualizado_em       timestamptz not null default now(),
  lembrete_enviado_em timestamptz
);

create index if not exists carrinhos_abandonados_varredura_idx
  on public.carrinhos_abandonados (atualizado_em)
  where lembrete_enviado_em is null;

alter table public.carrinhos_abandonados enable row level security;

-- Nasce sem policy (regra 8 do CLAUDE.md); libera só o dono do carrinho.
-- O job de varredura roda com service_role, que ignora RLS.
create policy carrinhos_abandonados_dono on public.carrinhos_abandonados
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
