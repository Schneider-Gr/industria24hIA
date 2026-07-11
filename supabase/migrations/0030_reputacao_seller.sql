-- Reputação do seller (inspirado no painel de Reputação do Mercado Livre):
-- os 3 indicadores exigem dado que hoje não existe no schema. Confirmado em
-- produção (2026-07-10) que pedidos.status_pedido só tem os valores
-- 'Pagamento Realizado' e 'Aguardando Pagamento' -- nunca 'Cancelado'.

-- 1) Cancelamento passa a ser um status válido (não havia constraint antes).
alter table public.pedidos
  add constraint pedidos_status_pedido_check
  check (status_pedido in ('Aguardando Pagamento','Pagamento Realizado','Cancelado'));

-- 2) Envio incorreto: flag própria em vez de inferir de status.
alter table public.entregas
  add column if not exists envio_correto boolean not null default true;

-- 3) Reclamações: não existia tabela nenhuma. Sem fluxo de criação ainda
--    (comprador/admin abrem a reclamação em feature futura) -- essa tabela
--    só destrava a leitura no /seller: vai começar vazia, não com dado mockado.
create table if not exists public.reclamacoes (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid not null references public.pedidos (id) on delete cascade,
  loja_id     uuid not null references public.lojas (id) on delete cascade,
  motivo      text not null,
  status      text not null default 'Aberta' check (status in ('Aberta','Resolvida')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.reclamacoes enable row level security;

drop policy if exists reclamacoes_owner_read on public.reclamacoes;
create policy reclamacoes_owner_read on public.reclamacoes for select
  using (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()));
-- ponytail: só leitura pro seller por enquanto -- INSERT/UPDATE ficam para
-- quando existir o fluxo de abertura/resolução de reclamação (admin ou comprador).

drop policy if exists reclamacoes_admin_all on public.reclamacoes;
create policy reclamacoes_admin_all on public.reclamacoes for all
  using (public.is_admin()) with check (public.is_admin());

-- Seller precisa enxergar as próprias entregas para calcular "envios incorretos"
-- (RLS de entregas era admin-only -- ver comentário em 0009_entregas.sql).
drop policy if exists entregas_owner_read on public.entregas;
create policy entregas_owner_read on public.entregas for select
  using (exists (select 1 from public.linha_itens li
                 join public.pedidos pe on pe.id = li.pedido_id
                 join public.lojas l on l.id = pe.loja_id
                 where li.id = linha_item_id and l.owner_id = auth.uid()));

create index if not exists reclamacoes_loja_idx on public.reclamacoes (loja_id);
create index if not exists reclamacoes_pedido_idx on public.reclamacoes (pedido_id);
