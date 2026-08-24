-- 0136: Uber Direct como transportadora selecionável no checkout (PRD 008,
-- Milestone 1). Reconciliação com o mecanismo de `transportadoras` (0099) em
-- vez da cascata backend originalmente desenhada no PRD — ver docs/prds/
-- 008-frete-uber-direct-fallback.md §2.

-- ============ fonte 'uber_direct' ============
alter table public.transportadoras drop constraint if exists transportadoras_fonte_check;
alter table public.transportadoras
  add constraint transportadoras_fonte_check
  check (fonte in ('interna', 'mercado_envios', 'uber_direct'));

-- Linha global (loja_id null): conta Uber Direct "Industria24horas" é única
-- para todo o marketplace, não por loja.
insert into public.transportadoras (id, nome, ativo, loja_id, fonte, prazo_dias)
values ('00000000-0000-4000-8000-0000000000e1', 'Entrega expressa (Uber Direct)', true, null, 'uber_direct', 0)
on conflict (id) do nothing;

-- ============ Cotação Uber Direct salva no momento do checkout ============
-- O comprador vê essa cotação antes de pagar (rota /api/checkout/cotar-frete);
-- o RPC checkout_criar_pedido usa o valor gravado aqui em vez de confiar num
-- número vindo do client. RLS ativado sem policy: só RPC security definer e
-- a rota de API (service role) tocam esta tabela.
create table if not exists public.cotacoes_frete_externo (
  id           uuid primary key default gen_random_uuid(),
  loja_id      uuid not null references public.lojas (id) on delete cascade,
  cep          text not null,
  fee_centavos integer not null check (fee_centavos > 0),
  prazo_min    integer,
  expira_em    timestamptz not null,
  criado_em    timestamptz not null default now()
);

alter table public.cotacoes_frete_externo enable row level security;

create index if not exists cotacoes_frete_externo_loja_id_idx
  on public.cotacoes_frete_externo (loja_id);
