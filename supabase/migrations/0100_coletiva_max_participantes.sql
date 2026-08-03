-- Limite de participantes por lote de desconto, definido pelo SELLER.
--
-- Pedido do dono: o lojista precisa poder capar quantos compradores entram
-- numa compra coletiva do seu produto (logística de retirada, fracionamento
-- de embalagem). O limite vive na promoção progressiva (o "lote de desconto"
-- do produto, uma linha por produto desde 0016/0023) e é COPIADO para a
-- coletiva na criação — igual a meta_qtd/valor_unitario, que já são travados
-- ali: mudar a promoção depois não pode mexer numa coletiva em andamento.
--
-- null = sem limite (comportamento atual preservado).

alter table public.promocoes_progressivas
  add column if not exists max_participantes int;

alter table public.promocoes_progressivas
  drop constraint if exists promocoes_max_participantes_check;
alter table public.promocoes_progressivas
  add constraint promocoes_max_participantes_check
  check (max_participantes is null or max_participantes >= 2);

alter table public.compras_coletivas
  add column if not exists max_participantes int
  check (max_participantes is null or max_participantes >= 2);

-- ============ coletiva_criar: herda o limite do lote ============
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
  v_max int;
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

  -- Primeira faixa (menor min_qtd) que dá desconto REAL sobre o preço base.
  select (elem->>'min_qtd')::int as min_qtd,
         (elem->>'valor_unitario')::numeric as valor_unitario
    into v_faixa
  from promocoes_progressivas pp, jsonb_array_elements(pp.faixas) as elem
  where pp.produto_id = p_produto_id
    and pp.ativo
    and (elem->>'validade' is null or (elem->>'validade')::date >= current_date)
    and (elem->>'valor_unitario')::numeric < v_prod.valor
  order by (elem->>'min_qtd')::int asc
  limit 1;
  if v_faixa is null then
    raise exception 'Este produto não tem desconto progressivo válido (faixa abaixo do preço base).';
  end if;

  select pp.max_participantes into v_max
  from promocoes_progressivas pp
  where pp.produto_id = p_produto_id and pp.ativo
  limit 1;

  if p_quantidade >= v_faixa.min_qtd then
    raise exception 'Com % un você já atinge o desconto sozinho — compre direto.', p_quantidade;
  end if;
  if v_faixa.min_qtd > v_prod.estoque_atual then
    raise exception 'Estoque insuficiente para uma coletiva (meta % un, disponível %).',
      v_faixa.min_qtd, v_prod.estoque_atual;
  end if;

  insert into compras_coletivas
    (produto_id, loja_id, criador_id, meta_qtd, valor_unitario, preco_base,
     qtd_atual, prazo, max_participantes)
  values
    (v_prod.id, v_prod.loja_id, v_user, v_faixa.min_qtd, v_faixa.valor_unitario,
     v_prod.valor, p_quantidade, now() + make_interval(days => p_prazo_dias), v_max)
  returning id into v_id;

  insert into coletiva_participacoes (coletiva_id, user_id, quantidade)
  values (v_id, v_user, p_quantidade);

  return v_id;
end;
$$;

-- ============ coletiva_participar: recusa acima do limite ============
-- Só o INGRESSO de um participante novo é limitado — quem já está dentro pode
-- aumentar a própria quantidade (o on conflict soma), o que ajuda a coletiva a
-- fechar sem furar o teto do seller. O `for update` da coletiva (0069) já
-- serializa a contagem contra corrida de duas entradas simultâneas.
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
  v_ja_participa boolean;
  v_total_part int;
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

  if v_col.max_participantes is not null then
    select exists (
      select 1 from coletiva_participacoes
      where coletiva_id = v_col.id and user_id = v_user
    ) into v_ja_participa;

    if not v_ja_participa then
      select count(*) into v_total_part
      from coletiva_participacoes where coletiva_id = v_col.id;

      if v_total_part >= v_col.max_participantes then
        raise exception 'Esta compra coletiva já tem o número máximo de participantes definido pelo vendedor (%).',
          v_col.max_participantes;
      end if;
    end if;
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

-- Contagem de participantes visível na vitrine (a policy de
-- coletiva_participacoes só deixa cada um ver a própria linha).
create or replace view public.coletiva_participantes_total as
  select coletiva_id, count(*)::int as total
  from public.coletiva_participacoes
  group by coletiva_id;

grant select on public.coletiva_participantes_total to anon, authenticated;
