-- 0145: tabela de frete por transportadora (faixa de CEP destino x faixa de
-- peso -> valor), importada via upload (admin e seller). Convive com o
-- motor % existente (faixas_cep) — não substitui. Ver openspec/changes/
-- transportadoras-tabela-frete-upload/ e docs/prd/fluxo-frete-completo.md.

alter table public.transportadoras
  drop constraint if exists transportadoras_fonte_check;

alter table public.transportadoras
  add constraint transportadoras_fonte_check
  check (fonte in ('interna', 'mercado_envios', 'uber_direct', 'tabela_importada'));

create table if not exists public.transportadora_faixas_frete (
  id                  uuid primary key default gen_random_uuid(),
  transportadora_id   uuid not null references public.transportadoras (id) on delete cascade,
  -- loja_id NULL = faixa global (admin); preenchido = override da própria loja.
  loja_id             uuid references public.lojas (id) on delete cascade,
  cep_destino_inicial text not null,
  cep_destino_final   text not null,
  peso_min            numeric not null default 0,
  peso_max            numeric not null,
  valor               numeric not null check (valor >= 0),
  ativo               boolean not null default true,
  criado_em           timestamptz not null default now(),
  check (cep_destino_inicial <= cep_destino_final),
  check (peso_max >= peso_min)
);

alter table public.transportadora_faixas_frete enable row level security;

-- leitura: faixa de transportadora ativa é pública (checkout); dono da loja e admin veem tudo.
drop policy if exists transportadora_faixas_frete_read on public.transportadora_faixas_frete;
create policy transportadora_faixas_frete_read on public.transportadora_faixas_frete
  for select using (
    ativo
    or public.is_admin()
    or loja_id in (select id from public.lojas where owner_id = auth.uid())
  );

drop policy if exists transportadora_faixas_frete_admin_all on public.transportadora_faixas_frete;
create policy transportadora_faixas_frete_admin_all on public.transportadora_faixas_frete
  for all using (public.is_admin()) with check (public.is_admin());

-- escrita seller: só faixas da PRÓPRIA loja (override; loja_id obrigatório).
drop policy if exists transportadora_faixas_frete_seller_own on public.transportadora_faixas_frete;
create policy transportadora_faixas_frete_seller_own on public.transportadora_faixas_frete
  for all
  using (loja_id in (select id from public.lojas where owner_id = auth.uid()))
  with check (loja_id in (select id from public.lojas where owner_id = auth.uid()));

create index if not exists transportadora_faixas_frete_busca_idx
  on public.transportadora_faixas_frete (transportadora_id, cep_destino_inicial, cep_destino_final);
create index if not exists transportadora_faixas_frete_loja_id_idx
  on public.transportadora_faixas_frete (loja_id);
