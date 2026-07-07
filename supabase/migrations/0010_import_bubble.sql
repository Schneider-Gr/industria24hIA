-- Importação de dados do Bubble (docs/data-api-reconciliation.md).
-- 1) bubble_id em cada tabela importável: idempotência (re-rodar o import
--    faz upsert, nunca duplica) e rastreabilidade de origem.
-- 2) Afiliação por LOJA (decisão D-mig3, 2026-07-07): produção tem 51
--    Relacao_Afiliado_Loja e zero afiliação por produto.

alter table public.categorias             add column if not exists bubble_id text unique;
alter table public.subcategorias          add column if not exists bubble_id text unique;
alter table public.lojas                  add column if not exists bubble_id text unique;
alter table public.centros_distribuicao   add column if not exists bubble_id text unique;
alter table public.produtos               add column if not exists bubble_id text unique;
alter table public.afiliacoes             add column if not exists bubble_id text unique;
alter table public.vendas_futuras         add column if not exists bubble_id text unique;
alter table public.promocoes_progressivas add column if not exists bubble_id text unique;
alter table public.pedidos                add column if not exists bubble_id text unique;
alter table public.linha_itens            add column if not exists bubble_id text unique;

-- Imagens não têm _id próprio no Bubble (lista de URLs no produto):
-- unicidade por (produto_id, url) já basta para reimportar sem duplicar.
create unique index if not exists produto_imagens_unq
  on public.produto_imagens (produto_id, url);

-- Afiliação por loja: loja_id entra, produto_id vira opcional.
alter table public.afiliacoes
  add column if not exists loja_id uuid references public.lojas (id) on delete cascade,
  alter column produto_id drop not null;

alter table public.afiliacoes
  add constraint afiliacoes_alvo check (produto_id is not null or loja_id is not null);

-- Dono da loja gerencia afiliações da própria loja (espelha a policy por produto).
create policy afiliacoes_loja_owner_all on public.afiliacoes for all
  using (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()));

create index if not exists afiliacoes_loja_idx on public.afiliacoes (loja_id);
