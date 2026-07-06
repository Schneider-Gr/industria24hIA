-- Módulo Seller — schema v1 DERIVADO DA UI REAL (docs/seller-module.md).
-- Nomes de campo vêm dos formulários reais do painel /seller (fonte confiável).
-- Tipos exatos e relações (FK) são INFERIDOS: reconciliar com a Data API antes
-- de migrar dados de produção. RLS deny-by-default + policies escopadas ao seller.
-- NÃO aplicado em nenhum projeto ainda; arquivo para revisão.

-- ============ Taxonomia ============
create table if not exists public.categorias (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique   -- Supermercado, Pet Shop, Verduras, Legumes, Agro...
);

create table if not exists public.subcategorias (
  id           uuid primary key default gen_random_uuid(),
  categoria_id uuid references public.categorias (id) on delete cascade,
  nome         text not null    -- hortaliças, Ração, Fertilizante, Tijolo...
);

-- ============ Loja ============
create table if not exists public.lojas (
  id                        uuid primary key default gen_random_uuid(),
  owner_id                  uuid not null references auth.users (id) on delete cascade,
  nome                      text not null,
  cnpj                      text,
  descricao                 text,
  logotipo_url              text,
  banner_url                text,
  whatsapp                  text,
  email                     text,
  chave_pix                 text,
  tipo_chave_pix            text check (tipo_chave_pix in ('CNPJ','CPF','EMAIL','PHONE')),
  cep                       text,
  cidade                    text,
  bairro                    text,
  rua                       text,
  numero                    text,
  estado                    text,   -- UF
  complemento               text,
  permite_retirada_na_loja  boolean not null default false,
  created_at                timestamptz not null default now()
);

create table if not exists public.centros_distribuicao (
  id           uuid primary key default gen_random_uuid(),
  loja_id      uuid not null references public.lojas (id) on delete cascade,
  nome         text not null,
  localizacao  text,
  status       text not null default 'Ativo',
  created_at   timestamptz not null default now()
);

-- ============ Produto ============
create table if not exists public.produtos (
  id                   uuid primary key default gen_random_uuid(),
  loja_id              uuid not null references public.lojas (id) on delete cascade,
  nome                 text not null,
  descricao            text,
  valor                numeric(12,2) not null,
  sku                  text,
  quantidade_minima    integer,
  estoque_atual        integer not null default 0,
  cep_produto          text,
  categoria_id         uuid references public.categorias (id),
  subcategoria_id      uuid references public.subcategorias (id),
  permite_afiliacao    boolean not null default false,
  porcentagem_afiliado numeric(5,2) default 5,   -- default visto na UI
  altura               numeric(10,2),
  comprimento          numeric(10,2),
  largura              numeric(10,2),
  peso                 numeric(10,3),
  status_produto       text not null default 'Pendente',  -- aprovação (business-rules)
  created_at           timestamptz not null default now()
);

-- imagens do produto (a UI sugere lista)
create table if not exists public.produto_imagens (
  id          uuid primary key default gen_random_uuid(),
  produto_id  uuid not null references public.produtos (id) on delete cascade,
  url         text not null,
  ordem       integer not null default 0
);

-- produto disponível em quais centros de distribuição (M:N)
create table if not exists public.produto_centros (
  produto_id  uuid not null references public.produtos (id) on delete cascade,
  centro_id   uuid not null references public.centros_distribuicao (id) on delete cascade,
  primary key (produto_id, centro_id)
);

-- ============ Afiliação ============
create table if not exists public.afiliacoes (
  id           uuid primary key default gen_random_uuid(),
  produto_id   uuid not null references public.produtos (id) on delete cascade,
  afiliado_id  uuid references auth.users (id) on delete set null,
  identificador text,   -- email/nome exibido quando não é user vinculado
  porcentagem  numeric(5,2) not null,
  status       text not null default 'Pendente' check (status in ('Pendente','Aprovada','Suspensa')),
  created_at   timestamptz not null default now()
);

-- ============ Venda Futura ============
create table if not exists public.vendas_futuras (
  id          uuid primary key default gen_random_uuid(),
  produto_id  uuid not null references public.produtos (id) on delete cascade,
  previsao    date,
  estoque     integer,
  created_at  timestamptz not null default now()
);

-- ============ Promoção progressiva ============
create table if not exists public.promocoes_progressivas (
  id          uuid primary key default gen_random_uuid(),
  produto_id  uuid not null references public.produtos (id) on delete cascade,
  -- faixas: [{ "min_qtd": 10, "desconto_pct": 5 }, ...]
  faixas      jsonb not null default '[]'::jsonb,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============ Pedidos ============
create table if not exists public.pedidos (
  id             uuid primary key default gen_random_uuid(),
  id_venda       text not null unique,               -- código curto tipo 3F9U882N5J
  loja_id        uuid not null references public.lojas (id) on delete restrict,
  cliente_id     uuid references auth.users (id) on delete set null,
  cliente_nome   text,
  data           timestamptz not null default now(),
  status_pedido  text not null default 'Aguardando Pagamento',
  valor_pedido   numeric(12,2) not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists public.linha_itens (
  id               uuid primary key default gen_random_uuid(),
  pedido_id        uuid not null references public.pedidos (id) on delete cascade,
  produto_id       uuid references public.produtos (id) on delete set null,
  produto_nome     text,                       -- snapshot no momento da compra
  quantidade       integer not null,
  valor            numeric(12,2) not null,
  repasse_ind      numeric(12,2) not null default 0,  -- 5% plataforma
  repasse_afiliado numeric(12,2) not null default 0,
  transferido      boolean not null default false,
  entregue         boolean not null default false,
  pago             boolean not null default false
);

-- ============ RLS deny-by-default + policies escopadas ao seller ============
-- ponytail: policies só para o dono da loja (o que a UI /seller precisa).
-- Comprador/admin/afiliado entram em migrations seguintes, quando esses papéis
-- forem construídos. Sem policy = sem acesso (deny-by-default, regra 8).

alter table public.categorias            enable row level security;
alter table public.subcategorias         enable row level security;
alter table public.lojas                 enable row level security;
alter table public.centros_distribuicao  enable row level security;
alter table public.produtos              enable row level security;
alter table public.produto_imagens       enable row level security;
alter table public.produto_centros       enable row level security;
alter table public.afiliacoes            enable row level security;
alter table public.vendas_futuras        enable row level security;
alter table public.promocoes_progressivas enable row level security;
alter table public.pedidos               enable row level security;
alter table public.linha_itens           enable row level security;

-- Taxonomia é leitura pública (catálogo precisa)
create policy categorias_read on public.categorias for select using (true);
create policy subcategorias_read on public.subcategorias for select using (true);

-- Loja: dono faz tudo na própria loja
create policy lojas_owner_all on public.lojas for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Helper implícito: "sou dono da loja X?"
create policy centros_owner_all on public.centros_distribuicao for all
  using (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()));

create policy produtos_owner_all on public.produtos for all
  using (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()));

create policy produto_imagens_owner_all on public.produto_imagens for all
  using (exists (select 1 from public.produtos p join public.lojas l on l.id = p.loja_id
                 where p.id = produto_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.produtos p join public.lojas l on l.id = p.loja_id
                 where p.id = produto_id and l.owner_id = auth.uid()));

create policy produto_centros_owner_all on public.produto_centros for all
  using (exists (select 1 from public.produtos p join public.lojas l on l.id = p.loja_id
                 where p.id = produto_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.produtos p join public.lojas l on l.id = p.loja_id
                 where p.id = produto_id and l.owner_id = auth.uid()));

create policy afiliacoes_owner_all on public.afiliacoes for all
  using (exists (select 1 from public.produtos p join public.lojas l on l.id = p.loja_id
                 where p.id = produto_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.produtos p join public.lojas l on l.id = p.loja_id
                 where p.id = produto_id and l.owner_id = auth.uid()));

create policy vendas_futuras_owner_all on public.vendas_futuras for all
  using (exists (select 1 from public.produtos p join public.lojas l on l.id = p.loja_id
                 where p.id = produto_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.produtos p join public.lojas l on l.id = p.loja_id
                 where p.id = produto_id and l.owner_id = auth.uid()));

create policy promocoes_owner_all on public.promocoes_progressivas for all
  using (exists (select 1 from public.produtos p join public.lojas l on l.id = p.loja_id
                 where p.id = produto_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.produtos p join public.lojas l on l.id = p.loja_id
                 where p.id = produto_id and l.owner_id = auth.uid()));

-- Pedidos: o seller lê/edita pedidos da própria loja (comprador vê os seus em migration futura)
create policy pedidos_owner_all on public.pedidos for all
  using (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()));

create policy linha_itens_owner_all on public.linha_itens for all
  using (exists (select 1 from public.pedidos pe join public.lojas l on l.id = pe.loja_id
                 where pe.id = pedido_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.pedidos pe join public.lojas l on l.id = pe.loja_id
                 where pe.id = pedido_id and l.owner_id = auth.uid()));

create index if not exists produtos_loja_idx on public.produtos (loja_id);
create index if not exists pedidos_loja_idx on public.pedidos (loja_id);
create index if not exists linha_itens_pedido_idx on public.linha_itens (pedido_id);
create index if not exists subcategorias_categoria_idx on public.subcategorias (categoria_id);
