-- 0099: cadastro de transportadoras + tarifa por transportadora (paridade
-- Transportadora/CSVTransportadora do Bubble, mantida no modelo % do rebuild).
--
-- Decisão do dono (16/07): estender o frete % atual com transportadoras
-- selecionáveis no checkout, sem replicar o cálculo peso/cubagem do Bubble.
-- Mercado Envios entra como transportadora de `fonte='mercado_envios'`
-- (cotação externa via MCP/API ML, fora desta migration); as internas usam
-- a tarifa % por faixa de CEP (faixas_cep.transportadora_id).

-- ============ Transportadoras ============
create table if not exists public.transportadoras (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  ativo      boolean not null default true,
  -- loja_id NULL = transportadora global (todas as lojas); preenchido = própria da loja.
  loja_id    uuid references public.lojas (id) on delete cascade,
  -- 'interna' = tarifa % por faixa de CEP; 'mercado_envios' = cotação externa (ignora faixas_cep).
  fonte      text not null default 'interna' check (fonte in ('interna', 'mercado_envios')),
  prazo_dias int check (prazo_dias is null or prazo_dias >= 0),
  logo_url   text,
  fake       boolean not null default false, -- transportadora de demo/seed
  criado_em  timestamptz not null default now()
);

alter table public.transportadoras enable row level security;

-- leitura: qualquer um vê as ativas (checkout/vitrine); dono da loja e admin veem as suas.
drop policy if exists transportadoras_read on public.transportadoras;
create policy transportadoras_read on public.transportadoras
  for select using (
    ativo
    or public.is_admin()
    or loja_id in (select id from public.lojas where owner_id = auth.uid())
  );

-- escrita admin: transportadoras globais e moderação geral.
drop policy if exists transportadoras_admin_all on public.transportadoras;
create policy transportadoras_admin_all on public.transportadoras
  for all using (public.is_admin()) with check (public.is_admin());

-- escrita seller: só transportadoras da PRÓPRIA loja (loja_id obrigatório).
drop policy if exists transportadoras_seller_own on public.transportadoras;
create policy transportadoras_seller_own on public.transportadoras
  for all
  using (loja_id in (select id from public.lojas where owner_id = auth.uid()))
  with check (loja_id in (select id from public.lojas where owner_id = auth.uid()));

create index if not exists transportadoras_loja_id_idx on public.transportadoras (loja_id);

-- ============ Tarifa por transportadora ============
-- faixas_cep já tem loja_id (0047). transportadora_id NULL = faixa sem carrier
-- (comportamento global atual preservado); preenchido = tarifa daquela carrier.
alter table public.faixas_cep
  add column if not exists transportadora_id uuid references public.transportadoras (id) on delete cascade;

create index if not exists faixas_cep_transportadora_id_idx on public.faixas_cep (transportadora_id);

-- escrita em faixas_cep: até aqui não havia policy (só service/admin). Libera
-- admin (faixas globais/qualquer) e seller (só faixas da própria loja).
drop policy if exists faixas_cep_admin_all on public.faixas_cep;
create policy faixas_cep_admin_all on public.faixas_cep
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists faixas_cep_seller_own on public.faixas_cep;
create policy faixas_cep_seller_own on public.faixas_cep
  for all
  using (loja_id in (select id from public.lojas where owner_id = auth.uid()))
  with check (loja_id in (select id from public.lojas where owner_id = auth.uid()));

-- ============ Transportadora escolhida por item ============
alter table public.linha_itens
  add column if not exists transportadora_id uuid references public.transportadoras (id);

-- ============ Transportadora fictícia (demo/QA) ============
-- Global, fonte interna, cobrindo os mesmos CEPs de Manaus já em faixas_cep,
-- com 8% de frete. Disponível no admin, no seller e no checkout imediatamente.
insert into public.transportadoras (id, nome, ativo, loja_id, fonte, prazo_dias, fake)
values ('00000000-0000-4000-8000-000000000059', 'Entrega Rápida I24', true, null, 'interna', 3, true)
on conflict (id) do nothing;

-- Faixas de tarifa da transportadora fictícia = clones das faixas globais
-- (loja_id null, transportadora_id null) com percentual 8.
insert into public.faixas_cep (cep_inicial, cep_final, percentual, ativo, loja_id, transportadora_id)
select f.cep_inicial, f.cep_final, 8, true, null, '00000000-0000-4000-8000-000000000059'
from public.faixas_cep f
where f.loja_id is null and f.transportadora_id is null
on conflict do nothing;
