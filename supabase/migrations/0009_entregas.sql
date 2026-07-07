-- Fulfillment mínimo: 1:1 com a linha de item, espelha o estado que hoje vive
-- na flag linha_itens.entregue, mas com status + rastreio próprios.

create table if not exists public.entregas (
  linha_item_id uuid primary key references public.linha_itens (id) on delete cascade,
  status        text not null default 'Pendente'
                check (status in ('Pendente','Enviado','Entregue')),
  rastreio      text,
  atualizado_em timestamptz not null default now()
);

alter table public.entregas enable row level security;

drop policy if exists entregas_admin_all on public.entregas;
create policy entregas_admin_all on public.entregas
  for all using (public.is_admin()) with check (public.is_admin());
-- ponytail: só admin agora (a tela vive em /admin). Policy de seller-owner
-- (via linha_itens->pedidos->lojas.owner_id) quando o /seller precisar editar entrega.
