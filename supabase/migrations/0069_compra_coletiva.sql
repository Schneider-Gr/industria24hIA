-- Compra coletiva entre compradores pequenos (PRD Confluence 1310721 / MPDD-36).
-- Vários compradores somam quantidades até a PRIMEIRA faixa do desconto
-- progressivo (promocoes_progressivas, migration 0016). Ninguém é cobrado
-- antes da meta: os pedidos (um por participante, preço da faixa) só nascem
-- quando qtd_atual >= meta_qtd — expirar é só marcar status, sem estorno.
-- Pagamento individual reusa o fluxo existente de /pedido/[id] (Asaas).
-- ponytail: v1 é retirada na loja (frete conjunto por região fica p/ v2,
-- como o próprio PRD sugere no Out of Scope).

-- ============ 1. Tabelas ============
create table if not exists public.compras_coletivas (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id) on delete cascade,
  loja_id uuid not null references public.lojas (id) on delete cascade,
  criador_id uuid not null references auth.users (id) on delete cascade,
  meta_qtd int not null check (meta_qtd > 0),
  valor_unitario numeric(12,2) not null check (valor_unitario > 0),
  preco_base numeric(12,2) not null check (preco_base > 0),
  qtd_atual int not null default 0 check (qtd_atual >= 0),
  prazo timestamptz not null,
  status text not null default 'Aberta'
    check (status in ('Aberta', 'Atingida', 'Expirada', 'Cancelada')),
  created_at timestamptz not null default now()
);

create table if not exists public.coletiva_participacoes (
  id uuid primary key default gen_random_uuid(),
  coletiva_id uuid not null references public.compras_coletivas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  quantidade int not null check (quantidade > 0),
  pedido_id uuid references public.pedidos (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (coletiva_id, user_id)
);

create index if not exists compras_coletivas_produto_idx
  on public.compras_coletivas (produto_id) where status = 'Aberta';

-- ============ 2. RLS ============
-- Escrita SÓ pelas RPCs security definer; leitura da coletiva é pública
-- (barra de progresso na vitrine, link de convite); participação só o próprio.
alter table public.compras_coletivas enable row level security;
alter table public.coletiva_participacoes enable row level security;

create policy coletivas_public_read on public.compras_coletivas
  for select using (true);

create policy participacoes_own_read on public.coletiva_participacoes
  for select using (user_id = auth.uid());

-- ============ 3. Criar coletiva ============
-- Meta = menor min_qtd das faixas ativas do produto (a primeira faixa de
-- desconto); o preço travado é o valor_unitario dessa faixa.
create or replace function public.coletiva_criar(
  p_produto_id uuid,
  p_quantidade int,
  p_prazo_dias int default 7
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_prod record;
  v_faixa record;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Faça login para criar uma compra coletiva.';
  end if;
  if p_quantidade is null or p_quantidade < 1 then
    raise exception 'Quantidade inválida.';
  end if;
  if p_prazo_dias is null or p_prazo_dias < 1 or p_prazo_dias > 30 then
    raise exception 'Prazo deve ser entre 1 e 30 dias.';
  end if;

  select p.id, p.loja_id, p.nome, p.valor, p.estoque_atual into v_prod
  from produtos p
  join lojas l on l.id = p.loja_id
  where p.id = p_produto_id
    and p.status_produto = 'Aprovado'
    and p.valor > 0
    and l.situacao = 'Ativa';
  if not found then
    raise exception 'Produto indisponível.';
  end if;

  select (elem->>'min_qtd')::int as min_qtd,
         (elem->>'valor_unitario')::numeric as valor_unitario
    into v_faixa
  from promocoes_progressivas pp, jsonb_array_elements(pp.faixas) as elem
  where pp.produto_id = p_produto_id
    and pp.ativo
    and (elem->>'validade' is null or (elem->>'validade')::date >= current_date)
  order by (elem->>'min_qtd')::int asc
  limit 1;
  if v_faixa is null then
    raise exception 'Este produto não tem desconto progressivo ativo.';
  end if;

  if p_quantidade >= v_faixa.min_qtd then
    raise exception 'Com % un você já atinge o desconto sozinho — compre direto.', p_quantidade;
  end if;
  if v_faixa.min_qtd > v_prod.estoque_atual then
    raise exception 'Estoque insuficiente para uma coletiva (meta % un, disponível %).',
      v_faixa.min_qtd, v_prod.estoque_atual;
  end if;

  insert into compras_coletivas
    (produto_id, loja_id, criador_id, meta_qtd, valor_unitario, preco_base,
     qtd_atual, prazo)
  values
    (v_prod.id, v_prod.loja_id, v_user, v_faixa.min_qtd, v_faixa.valor_unitario,
     v_prod.valor, p_quantidade, now() + make_interval(days => p_prazo_dias))
  returning id into v_id;

  insert into coletiva_participacoes (coletiva_id, user_id, quantidade)
  values (v_id, v_user, p_quantidade);

  return v_id;
end;
$$;

-- ============ 4. Participar (e fechar ao atingir a meta) ============
-- Devolve {status, qtd_atual, meta_qtd, pedido_id} — pedido_id preenchido
-- (o do chamador) quando a meta foi atingida nesta chamada.
create or replace function public.coletiva_participar(
  p_coletiva_id uuid,
  p_quantidade int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_col record;
  v_prod record;
  v_part record;
  v_pedido uuid;
  v_meu_pedido uuid;
  v_valor_item numeric(12,2);
begin
  if v_user is null then
    raise exception 'Faça login para participar da compra coletiva.';
  end if;
  if p_quantidade is null or p_quantidade < 1 then
    raise exception 'Quantidade inválida.';
  end if;

  -- lock serializa participações concorrentes na mesma coletiva
  select * into v_col from compras_coletivas
  where id = p_coletiva_id
  for update;
  if not found then
    raise exception 'Compra coletiva não encontrada.';
  end if;
  if v_col.status <> 'Aberta' then
    raise exception 'Esta compra coletiva não está mais aberta (%).', v_col.status;
  end if;
  if v_col.prazo < now() then
    update compras_coletivas set status = 'Expirada' where id = v_col.id;
    raise exception 'Esta compra coletiva expirou sem atingir a meta.';
  end if;

  select p.id, p.loja_id, p.nome, p.estoque_atual into v_prod
  from produtos p
  join lojas l on l.id = p.loja_id
  where p.id = v_col.produto_id
    and p.status_produto = 'Aprovado'
    and l.situacao = 'Ativa';
  if not found then
    raise exception 'Produto indisponível.';
  end if;
  if v_col.qtd_atual + p_quantidade > v_prod.estoque_atual then
    raise exception 'Estoque insuficiente de "%" (disponível: %).',
      v_prod.nome, v_prod.estoque_atual - v_col.qtd_atual;
  end if;

  insert into coletiva_participacoes (coletiva_id, user_id, quantidade)
  values (v_col.id, v_user, p_quantidade)
  on conflict (coletiva_id, user_id)
  do update set quantidade = coletiva_participacoes.quantidade + excluded.quantidade;

  update compras_coletivas
  set qtd_atual = qtd_atual + p_quantidade
  where id = v_col.id
  returning * into v_col;

  -- Meta atingida: cria UM pedido por participante ao preço da faixa,
  -- retirada na loja, 5% de repasse da plataforma, sem afiliado.
  -- Cada participante paga o seu via /pedido/[id] (Asaas).
  if v_col.qtd_atual >= v_col.meta_qtd then
    perform set_config('app.checkout_rpc', 'on', true);

    for v_part in
      select * from coletiva_participacoes
      where coletiva_id = v_col.id and pedido_id is null
    loop
      v_valor_item := round(v_col.valor_unitario * v_part.quantidade, 2);

      insert into pedidos (id_venda, loja_id, cliente_id, data, status_pedido,
                           valor_pedido, forma_pagamento)
      values (upper(substr(md5(random()::text), 1, 10)), v_col.loja_id,
              v_part.user_id, now(), 'Aguardando Pagamento', v_valor_item, 'PIX')
      returning id into v_pedido;

      insert into linha_itens (pedido_id, produto_id, produto_nome, quantidade,
        valor, repasse_ind, repasse_afiliado, retirar_na_loja, valor_frete)
      values (v_pedido, v_prod.id, v_prod.nome, v_part.quantidade,
        v_valor_item, round(v_valor_item * 0.05, 2), 0, true, null);

      update coletiva_participacoes set pedido_id = v_pedido where id = v_part.id;
      if v_part.user_id = v_user then
        v_meu_pedido := v_pedido;
      end if;
    end loop;

    update produtos set estoque_atual = estoque_atual - v_col.qtd_atual
    where id = v_prod.id;

    update compras_coletivas set status = 'Atingida' where id = v_col.id;
    v_col.status := 'Atingida';
  end if;

  return jsonb_build_object(
    'status', v_col.status,
    'qtd_atual', v_col.qtd_atual,
    'meta_qtd', v_col.meta_qtd,
    'pedido_id', v_meu_pedido
  );
end;
$$;

revoke all on function public.coletiva_criar(uuid, int, int) from public;
grant execute on function public.coletiva_criar(uuid, int, int) to authenticated;
revoke all on function public.coletiva_participar(uuid, int) from public;
grant execute on function public.coletiva_participar(uuid, int) to authenticated;
