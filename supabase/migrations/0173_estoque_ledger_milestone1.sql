-- 0173: Ledger de estoque — Milestone 1 do PRD 036 (US01 + US06). Issue #661.
--
-- O estoque do marketplace é hoje um inteiro por produto (produtos.estoque_atual),
-- decrementado dentro de checkout_criar_pedido (0014:206, 0018:135, 0019:157,
-- 0020:159). Não há movimentação, não há motivo, não há autor e não há local: o
-- saldo é um número que alguém sobrescreveu.
--
-- Esta migration introduz o livro de movimentações e o saldo por centro SEM tocar
-- em checkout_criar_pedido. A RPC continua escrevendo em produtos.estoque_atual
-- exatamente como hoje (verificado em prod 16/09: a definição vigente de 3 args
-- ainda faz `update produtos set estoque_atual = estoque_atual - v_qtd`), e um
-- trigger sobre essa escrita gera o lançamento correspondente.
--
-- Direção da autoridade nesta fase: produtos.estoque_atual continua sendo a
-- origem da escrita e o ledger é o espelho auditável. A inversão (ledger como
-- fonte, estoque_atual derivado) acontece no Milestone 2, junto com a reserva,
-- para que a mudança do modelo de dados e a mudança do caminho do dinheiro não
-- viajem na mesma entrega. Enquanto isso não ocorre, esta migration é
-- reversível: basta remover os triggers e as duas tabelas.

-- ============================================================
-- 1. Centro de distribuição como local de estoque
-- ============================================================

alter table public.centros_distribuicao
  add column if not exists tipo   text    not null default 'seller',
  add column if not exists padrao boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'centros_distribuicao_tipo_valido'
  ) then
    alter table public.centros_distribuicao
      add constraint centros_distribuicao_tipo_valido
      check (tipo in ('seller', 'industria'));
  end if;
end $$;

-- Um único local padrão por loja.
create unique index if not exists centros_distribuicao_padrao_unico
  on public.centros_distribuicao (loja_id)
  where padrao;

-- Loja que já tem centro: o ativo mais antigo vira o padrão.
with escolhido as (
  select distinct on (loja_id) id
  from public.centros_distribuicao
  where status = 'Ativo'
  order by loja_id, created_at asc
)
update public.centros_distribuicao c
   set padrao = true
  from escolhido e
 where c.id = e.id
   and not exists (
     select 1 from public.centros_distribuicao x
      where x.loja_id = c.loja_id and x.padrao
   );

-- Loja sem nenhum centro: ganha um local padrão. Em prod (16/09) são 17 das 21
-- lojas, ou seja, este é o caso majoritário e não a exceção.
insert into public.centros_distribuicao (loja_id, nome, localizacao, status, tipo, padrao)
select l.id, 'Estoque principal', null, 'Ativo', 'seller', true
  from public.lojas l
 where not exists (
   select 1 from public.centros_distribuicao c where c.loja_id = l.id
 );

-- ============================================================
-- 2. Livro de movimentações
-- ============================================================

create table if not exists public.estoque_movimentos (
  id          uuid primary key default gen_random_uuid(),
  produto_id  uuid not null references public.produtos (id) on delete cascade,
  centro_id   uuid not null references public.centros_distribuicao (id),
  quantidade  int  not null,
  tipo        text not null,
  origem      text not null,
  motivo      text not null,
  -- Autor é o usuário autenticado quando existe. Migração e rotinas de sistema
  -- não têm autor humano; `origem` é que é sempre obrigatória. Inventar um uuid
  -- para preencher a coluna seria dado falso, proibido pelo CLAUDE.md.
  autor       uuid references auth.users (id),
  pedido_id   uuid references public.pedidos (id) on delete set null,
  -- clock_timestamp(), não now(): now() devolve o início da TRANSAÇÃO, então dois
  -- lançamentos gravados na mesma transação (baixa + reposição, por exemplo)
  -- ficariam com a mesma marca e o extrato ordenado por data seria ambíguo.
  criado_em   timestamptz not null default clock_timestamp(),

  constraint estoque_movimentos_quantidade_nao_zero check (quantidade <> 0),
  constraint estoque_movimentos_tipo_valido
    check (tipo in ('entrada', 'saida', 'ajuste', 'transferencia')),
  constraint estoque_movimentos_origem_valida
    check (origem in ('checkout', 'ajuste_seller', 'migracao', 'sistema')),
  constraint estoque_movimentos_motivo_preenchido
    check (btrim(motivo) <> '')
);

create index if not exists estoque_movimentos_produto_data_idx
  on public.estoque_movimentos (produto_id, criado_em desc);

create index if not exists estoque_movimentos_centro_idx
  on public.estoque_movimentos (centro_id);

-- Imutabilidade no banco, não por convenção da aplicação: nem service_role
-- altera ou remove lançamento. Correção se faz com lançamento contrário.
create or replace function public.estoque_movimento_imutavel()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Lançamento de estoque é imutável. Para corrigir, grave um lançamento contrário (id: %).',
    coalesce(old.id::text, '?');
end;
$$;

drop trigger if exists estoque_movimentos_sem_update on public.estoque_movimentos;
create trigger estoque_movimentos_sem_update
  before update or delete on public.estoque_movimentos
  for each row execute function public.estoque_movimento_imutavel();

-- ============================================================
-- 3. Saldo por produto e centro
-- ============================================================

create table if not exists public.estoque_saldos (
  produto_id  uuid not null references public.produtos (id) on delete cascade,
  centro_id   uuid not null references public.centros_distribuicao (id),
  quantidade  int  not null default 0,
  atualizado_em timestamptz not null default now(),

  primary key (produto_id, centro_id),
  constraint estoque_saldos_nao_negativo check (quantidade >= 0)
);

-- Garante a linha do saldo e só então soma a delta.
--
-- Não usar `insert ... on conflict do update set quantidade = quantidade +
-- excluded.quantidade`: o Postgres avalia os CHECK da tabela na tupla PROPOSTA
-- antes de detectar o conflito, então um lançamento de saída (-3) estoura
-- estoque_saldos_nao_negativo sem nunca chegar ao DO UPDATE. O teste em
-- transação pegou exatamente isso.
--
-- O UPDATE trava a linha, serializando escritas concorrentes sobre o mesmo par
-- produto/centro, e avalia o CHECK sobre o valor final: duas compras
-- simultâneas da última unidade não produzem saldo negativo.
create or replace function public.estoque_aplicar_no_saldo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.estoque_saldos (produto_id, centro_id, quantidade)
  values (new.produto_id, new.centro_id, 0)
  on conflict (produto_id, centro_id) do nothing;

  update public.estoque_saldos
     set quantidade = quantidade + new.quantidade,
         atualizado_em = now()
   where produto_id = new.produto_id
     and centro_id  = new.centro_id;

  return new;
end;
$$;

drop trigger if exists estoque_movimentos_aplica_saldo on public.estoque_movimentos;
create trigger estoque_movimentos_aplica_saldo
  after insert on public.estoque_movimentos
  for each row execute function public.estoque_aplicar_no_saldo();

-- ============================================================
-- 4. Resolução do centro de um produto
-- ============================================================

-- Produto vinculado a exatamente um centro usa aquele centro; qualquer outro
-- caso cai no padrão da loja. Em prod (16/09) os 30 vínculos existentes são
-- todos de centro único e nenhum produto tem mais de um, então o caso de rateio
-- não existe hoje — se passar a existir, o produto cai no padrão em vez de ser
-- rateado em silêncio.
create or replace function public.estoque_centro_do_produto(p_produto_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (array_agg(distinct pc.centro_id))[1]
       from public.produto_centros pc
      where pc.produto_id = p_produto_id
     having count(distinct pc.centro_id) = 1),
    (select c.id
       from public.centros_distribuicao c
       join public.produtos p on p.loja_id = c.loja_id
      where p.id = p_produto_id and c.padrao
      limit 1)
  );
$$;

-- ============================================================
-- 5. Seed do saldo vigente (US06)
-- ============================================================

insert into public.estoque_movimentos
  (produto_id, centro_id, quantidade, tipo, origem, motivo)
select p.id,
       public.estoque_centro_do_produto(p.id),
       p.estoque_atual,
       'entrada',
       'migracao',
       'Saldo inicial da migração para o ledger (0173)'
  from public.produtos p
 where p.estoque_atual > 0
   and public.estoque_centro_do_produto(p.id) is not null;

-- Produto com saldo zero não gera lançamento, mas passa a ter linha de saldo
-- para que o extrato do Milestone 3 não precise tratar ausência como zero.
insert into public.estoque_saldos (produto_id, centro_id, quantidade)
select p.id, public.estoque_centro_do_produto(p.id), 0
  from public.produtos p
 where p.estoque_atual = 0
   and public.estoque_centro_do_produto(p.id) is not null
on conflict do nothing;

-- Paridade: se algum produto divergir, a migration falha inteira e nada é
-- aplicado. Não existe tolerância aceitável aqui — seller que vê o estoque
-- mudar sozinho não volta a confiar no marketplace.
do $$
declare
  v_divergentes int;
begin
  select count(*) into v_divergentes
    from public.produtos p
    left join (
      select produto_id, sum(quantidade) as saldo
        from public.estoque_saldos group by produto_id
    ) s on s.produto_id = p.id
   where coalesce(s.saldo, 0) <> p.estoque_atual;

  if v_divergentes > 0 then
    raise exception 'Migração abortada: % produto(s) com saldo divergente entre o ledger e estoque_atual.', v_divergentes;
  end if;
end $$;

-- ============================================================
-- 6. Espelho das escritas em produtos.estoque_atual
-- ============================================================
-- Criado DEPOIS do seed, de propósito: antes, o próprio seed dispararia o
-- trigger e duplicaria o saldo.

-- A função de ajuste do seller anuncia o motivo em app.estoque_motivo; o
-- trigger o consome. Sem anúncio, a escrita veio do checkout ou de rotina de
-- sistema e recebe motivo genérico, nunca nulo.
create or replace function public.estoque_espelhar_produto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta   int := new.estoque_atual - old.estoque_atual;
  v_centro  uuid;
  v_motivo  text := nullif(btrim(coalesce(current_setting('app.estoque_motivo', true), '')), '');
  v_origem  text;
  v_tipo    text;
begin
  if v_delta = 0 then
    return new;
  end if;

  v_centro := public.estoque_centro_do_produto(new.id);
  if v_centro is null then
    return new; -- produto sem loja com centro: nada a espelhar
  end if;

  if v_motivo is not null then
    v_origem := 'ajuste_seller';
    v_tipo   := 'ajuste';
  else
    v_origem := case when v_delta < 0 then 'checkout' else 'sistema' end;
    v_tipo   := case when v_delta < 0 then 'saida' else 'entrada' end;
    v_motivo := case when v_delta < 0
                     then 'Baixa automática pela criação de pedido'
                     else 'Reposição automática (cancelamento, estorno ou rotina de sistema)'
                end;
  end if;

  insert into public.estoque_movimentos
    (produto_id, centro_id, quantidade, tipo, origem, motivo, autor)
  values (new.id, v_centro, v_delta, v_tipo, v_origem, v_motivo, auth.uid());

  return new;
end;
$$;

drop trigger if exists produtos_espelha_estoque on public.produtos;
create trigger produtos_espelha_estoque
  after update of estoque_atual on public.produtos
  for each row
  when (old.estoque_atual is distinct from new.estoque_atual)
  execute function public.estoque_espelhar_produto();

-- Produto novo já nasce com estoque_atual preenchido pelo cadastro
-- (produtos/actions.ts:79 grava no INSERT). Sem espelhar o INSERT, o saldo do
-- ledger ficaria em zero e a paridade com estoque_atual quebraria no primeiro
-- produto cadastrado depois desta migration.
create or replace function public.estoque_espelhar_produto_novo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_centro uuid;
begin
  if coalesce(new.estoque_atual, 0) = 0 then
    return new;
  end if;

  v_centro := public.estoque_centro_do_produto(new.id);
  if v_centro is null then
    return new;
  end if;

  insert into public.estoque_movimentos
    (produto_id, centro_id, quantidade, tipo, origem, motivo, autor)
  values (new.id, v_centro, new.estoque_atual, 'entrada', 'ajuste_seller',
          'Estoque inicial informado no cadastro do produto', auth.uid());

  return new;
end;
$$;

drop trigger if exists produtos_espelha_estoque_novo on public.produtos;
create trigger produtos_espelha_estoque_novo
  after insert on public.produtos
  for each row execute function public.estoque_espelhar_produto_novo();

-- ============================================================
-- 7. Ajuste de estoque pelo seller (motivo obrigatório)
-- ============================================================

create or replace function public.estoque_ajustar_produto(
  p_produto_id uuid,
  p_quantidade int,
  p_motivo     text
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_atual  int;
begin
  if v_user is null then
    raise exception 'Faça login para ajustar o estoque.';
  end if;
  if btrim(coalesce(p_motivo, '')) = '' then
    raise exception 'Informe o motivo do ajuste de estoque.';
  end if;
  if p_quantidade < 0 then
    raise exception 'Quantidade não pode ser negativa.';
  end if;

  select p.estoque_atual into v_atual
    from public.produtos p
    join public.lojas l on l.id = p.loja_id
   where p.id = p_produto_id and l.owner_id = v_user
     for update of p;

  if v_atual is null then
    raise exception 'Produto não encontrado nesta loja.';
  end if;

  if v_atual = p_quantidade then
    return v_atual; -- nada mudou: sem lançamento, sem exigir motivo na prática
  end if;

  perform set_config('app.estoque_motivo', p_motivo, true);
  update public.produtos set estoque_atual = p_quantidade where id = p_produto_id;
  perform set_config('app.estoque_motivo', '', true);

  return p_quantidade;
end;
$$;

revoke all on function public.estoque_ajustar_produto(uuid, int, text) from public;
grant execute on function public.estoque_ajustar_produto(uuid, int, text) to authenticated;

-- ============================================================
-- 8. RLS — negar por padrão
-- ============================================================

alter table public.estoque_movimentos enable row level security;
alter table public.estoque_saldos     enable row level security;

drop policy if exists estoque_movimentos_leitura_dono on public.estoque_movimentos;
create policy estoque_movimentos_leitura_dono
  on public.estoque_movimentos for select
  to authenticated
  using (
    exists (
      select 1 from public.produtos p
        join public.lojas l on l.id = p.loja_id
       where p.id = estoque_movimentos.produto_id
         and l.owner_id = auth.uid()
    )
  );

drop policy if exists estoque_saldos_leitura_dono on public.estoque_saldos;
create policy estoque_saldos_leitura_dono
  on public.estoque_saldos for select
  to authenticated
  using (
    exists (
      select 1 from public.produtos p
        join public.lojas l on l.id = p.loja_id
       where p.id = estoque_saldos.produto_id
         and l.owner_id = auth.uid()
    )
  );

-- Sem policy de INSERT/UPDATE/DELETE: escrita só pelas funções security definer
-- acima. Cliente não grava lançamento direto.
