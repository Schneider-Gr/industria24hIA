-- 0077: ciclo de vida da coletiva com LOTES PROGRESSIVOS e rateio no fechamento.
--
-- Mudança de desenho (decisão do dono, 24/07/2026): a coletiva não fecha mais
-- no instante em que a meta é batida. Bater a meta só a torna VIÁVEL; ela
-- segue aberta até o prazo acumulando volume e descendo de lote, e no
-- fechamento TODOS pagam o melhor preço atingido. Isso é o que dá função aos
-- lotes configurados pelo seller na 0076 — antes, da 2ª faixa em diante
-- ninguém nunca chegava.
--
-- Fecha quando: prazo vence estando viável, OU o teto de participantes é
-- atingido, OU o último lote é desbloqueado, OU o dono da loja fecha na mão.
-- Prazo vencido sem viabilidade → Expirada, sem pedidos e sem estorno
-- (ninguém é cobrado antes do fechamento — invariante do módulo desde a 0069).
--
-- Rateio no fechamento (o "checkout" da coletiva):
--   * preço = melhor lote atingido para qtd_atual (mesma regra de preco_faixa);
--   * cada pedido = round(preço × quantidade); a sobra de centavos do total
--     vai para o MAIOR participante, então soma(pedidos) == total ao centavo;
--   * frete conjunto (opcional): um destino comum, percentual da faixa_cep
--     como no checkout normal (0054), rateado por quantidade com a mesma
--     correção de centavos;
--   * pedido mínimo da loja avaliado sobre o TOTAL agregado — é a razão de
--     existir da coletiva, não faz sentido cobrar de cada participante.

-- ============ 1. Status novo + destino da entrega conjunta ============
alter table public.compras_coletivas
  drop constraint if exists compras_coletivas_status_check;
alter table public.compras_coletivas
  add constraint compras_coletivas_status_check
  check (status in ('Aberta', 'Viavel', 'Atingida', 'Expirada', 'Cancelada'));

-- Entrega conjunta: UM destino por coletiva (definido por quem cria), não um
-- endereço por participante — é o que torna o frete rateável.
alter table public.compras_coletivas
  add column if not exists entrega_cep text,
  add column if not exists entrega_rua text,
  add column if not exists entrega_numero text,
  add column if not exists entrega_bairro text,
  add column if not exists entrega_cidade text,
  add column if not exists entrega_complemento text;

-- ============ 2. Preço do lote (espelho de preco_faixa sobre o snapshot) ============
create or replace function public.coletiva_preco_lote(
  p_lotes jsonb,
  p_qtd int,
  p_base numeric
) returns numeric
language sql
immutable
as $$
  select coalesce(
    (select (elem->>'valor_unitario')::numeric
     from jsonb_array_elements(coalesce(p_lotes, '[]'::jsonb)) elem
     where (elem->>'min_qtd')::int <= p_qtd
       and (elem->>'validade' is null or (elem->>'validade')::date >= current_date)
     order by (elem->>'min_qtd')::int desc
     limit 1),
    p_base);
$$;

-- ============ 3. Criar (agora lendo a regra do seller) ============
create or replace function public.coletiva_criar(
  p_produto_id uuid,
  p_quantidade int,
  p_prazo_dias int default null,
  p_entrega jsonb default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_prod record;
  v_regra record;
  v_faixa record;
  v_lotes jsonb;
  v_meta int;
  v_unit numeric(12,2);
  v_prazo int;
  v_min_part int := 1;
  v_max_part int;
  v_frete_conj boolean := false;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Faça login para criar uma compra coletiva.';
  end if;
  if p_quantidade is null or p_quantidade < 1 then
    raise exception 'Quantidade inválida.';
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

  select * into v_regra from coletiva_regras
  where produto_id = p_produto_id and ativo;

  if found then
    -- Regra configurada pelo seller (0076) manda.
    v_lotes := v_regra.lotes;
    v_meta := coalesce(
      v_regra.meta_qtd,
      (select min((elem->>'min_qtd')::int) from jsonb_array_elements(v_regra.lotes) elem));
    v_prazo := coalesce(p_prazo_dias, v_regra.prazo_dias);
    v_min_part := v_regra.min_participantes;
    v_max_part := v_regra.max_participantes;
    v_frete_conj := v_regra.frete_conjunto;
  else
    -- Fallback: comportamento herdado da 0070 — 1ª faixa da promoção
    -- progressiva com desconto real vira meta e lote único.
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
    v_lotes := jsonb_build_array(jsonb_build_object(
      'min_qtd', v_faixa.min_qtd, 'valor_unitario', v_faixa.valor_unitario));
    v_meta := v_faixa.min_qtd;
    v_prazo := coalesce(p_prazo_dias, 7);
  end if;

  if v_meta is null or v_meta < 1 then
    raise exception 'Este produto não tem meta de compra coletiva configurada.';
  end if;
  if v_prazo < 1 or v_prazo > 30 then
    raise exception 'Prazo deve ser entre 1 e 30 dias.';
  end if;
  if p_quantidade >= v_meta then
    raise exception 'Com % un você já atinge o desconto sozinho — compre direto.', p_quantidade;
  end if;
  if v_meta > v_prod.estoque_atual then
    raise exception 'Estoque insuficiente para uma coletiva (meta % un, disponível %).',
      v_meta, v_prod.estoque_atual;
  end if;
  if v_max_part is not null and v_max_part < v_min_part then
    raise exception 'Regra inconsistente: máximo de participantes menor que o mínimo.';
  end if;
  if v_frete_conj and (p_entrega is null or coalesce(p_entrega->>'cep', '') = '') then
    raise exception 'Esta coletiva é com entrega conjunta — informe o endereço de entrega.';
  end if;

  -- preço travado histórico = melhor lote já elegível na criação (compat 0069)
  v_unit := coletiva_preco_lote(v_lotes, v_meta, v_prod.valor);

  insert into compras_coletivas
    (produto_id, loja_id, criador_id, meta_qtd, valor_unitario, preco_base,
     qtd_atual, prazo, regra_id, lotes, min_participantes, max_participantes,
     frete_conjunto, entrega_cep, entrega_rua, entrega_numero, entrega_bairro,
     entrega_cidade, entrega_complemento)
  values
    (v_prod.id, v_prod.loja_id, v_user, v_meta, v_unit, v_prod.valor,
     p_quantidade, now() + make_interval(days => v_prazo),
     case when v_regra.id is not null then v_regra.id end, v_lotes,
     v_min_part, v_max_part, v_frete_conj,
     case when v_frete_conj then p_entrega->>'cep' end,
     case when v_frete_conj then p_entrega->>'rua' end,
     case when v_frete_conj then p_entrega->>'numero' end,
     case when v_frete_conj then p_entrega->>'bairro' end,
     case when v_frete_conj then p_entrega->>'cidade' end,
     case when v_frete_conj then p_entrega->>'complemento' end)
  returning id into v_id;

  insert into coletiva_participacoes (coletiva_id, user_id, quantidade)
  values (v_id, v_user, p_quantidade);

  -- eventos vivem na 0078; resolução de nome em plpgsql é em runtime.
  perform coletiva_evento(v_id, 'criada',
    jsonb_build_object('meta_qtd', v_meta, 'lotes', v_lotes, 'prazo_dias', v_prazo));

  return v_id;
end;
$$;

-- ============ 4. Fechar: gera os pedidos e DIVIDE entre os compradores ============
-- Idempotente e serializada por `for update`. Chamada pela participação, pela
-- varredura (/api/coletivas/tick) e pelo dono da loja (p_forcar).
create or replace function public.coletiva_fechar(
  p_coletiva_id uuid,
  p_forcar boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_col record;
  v_prod record;
  v_owner uuid;
  v_minimo numeric(12,2);
  v_participantes int;
  v_viavel boolean;
  v_ultimo_lote int;
  v_unit numeric(12,2);
  v_total numeric(12,2);
  v_soma numeric(12,2) := 0;
  v_delta numeric(12,2);
  v_percentual numeric;
  v_frete_total numeric(12,2) := 0;
  v_frete_soma numeric(12,2) := 0;
  v_frete_delta numeric(12,2) := 0;
  v_part record;
  v_valor numeric(12,2);
  v_frete numeric(12,2);
  v_primeiro boolean := true;
  v_pedido uuid;
begin
  select c.*, l.owner_id into v_col
  from compras_coletivas c
  join lojas l on l.id = c.loja_id
  where c.id = p_coletiva_id
  for update of c;
  if not found then
    raise exception 'Compra coletiva não encontrada.';
  end if;
  v_owner := v_col.owner_id;

  -- já resolvida: nada a fazer (idempotência)
  if v_col.status in ('Atingida', 'Expirada', 'Cancelada') then
    return jsonb_build_object('status', v_col.status, 'fechou', false);
  end if;

  if p_forcar and v_owner <> auth.uid() then
    raise exception 'Apenas o dono da loja pode fechar esta coletiva manualmente.';
  end if;

  select count(*) into v_participantes
  from coletiva_participacoes where coletiva_id = v_col.id;

  select p.id, p.loja_id, p.nome, p.estoque_atual into v_prod
  from produtos p where p.id = v_col.produto_id;

  v_unit := coletiva_preco_lote(v_col.lotes, v_col.qtd_atual, v_col.preco_base);
  -- coletivas criadas antes da 0076 não têm lotes: preço travado da 0069
  if v_col.lotes = '[]'::jsonb then
    v_unit := v_col.valor_unitario;
  end if;
  v_total := round(v_unit * v_col.qtd_atual, 2);

  select valor_pedido_minimo into v_minimo from lojas where id = v_col.loja_id;

  v_viavel := v_col.qtd_atual >= v_col.meta_qtd
              and v_participantes >= v_col.min_participantes
              and v_total >= coalesce(v_minimo, 0);

  if not v_viavel then
    if v_col.prazo < now() then
      update compras_coletivas set status = 'Expirada' where id = v_col.id;
      perform coletiva_evento(v_col.id, 'expirada',
        jsonb_build_object('qtd_atual', v_col.qtd_atual, 'meta_qtd', v_col.meta_qtd,
                           'participantes', v_participantes));
      return jsonb_build_object('status', 'Expirada', 'fechou', false);
    end if;
    return jsonb_build_object('status', v_col.status, 'fechou', false);
  end if;

  -- Viável: só fecha nos gatilhos combinados.
  select max((elem->>'min_qtd')::int) into v_ultimo_lote
  from jsonb_array_elements(v_col.lotes) elem;

  if not (
    p_forcar
    or v_col.prazo < now()
    or (v_col.max_participantes is not null and v_participantes >= v_col.max_participantes)
    or (v_ultimo_lote is not null and v_col.qtd_atual >= v_ultimo_lote)
  ) then
    if v_col.status = 'Aberta' then
      update compras_coletivas set status = 'Viavel' where id = v_col.id;
      perform coletiva_evento(v_col.id, 'meta_atingida',
        jsonb_build_object('marco', v_col.meta_qtd::text, 'qtd_atual', v_col.qtd_atual,
                           'preco', v_unit));
    end if;
    return jsonb_build_object('status', 'Viavel', 'fechou', false);
  end if;

  if v_col.qtd_atual > v_prod.estoque_atual then
    raise exception 'Estoque insuficiente de "%" para fechar a coletiva (necessário %, disponível %).',
      v_prod.nome, v_col.qtd_atual, v_prod.estoque_atual;
  end if;

  -- Frete conjunto: um destino, percentual da faixa de CEP como no checkout.
  if v_col.frete_conjunto and v_col.entrega_cep is not null then
    -- faixas_cep guarda o CEP como número; a coletiva guarda texto.
    select percentual into v_percentual
    from faixas_cep
    where ativo
      and regexp_replace(v_col.entrega_cep, '\D', '', 'g')::bigint
          between cep_inicial and cep_final
      and (loja_id = v_col.loja_id or loja_id is null)
    order by (loja_id = v_col.loja_id) desc, (cep_final - cep_inicial) asc
    limit 1;
    if v_percentual is null then
      raise exception 'Entrega indisponível para o CEP da coletiva (%).', v_col.entrega_cep;
    end if;
    v_frete_total := round(v_total * v_percentual / 100, 2);
  end if;

  -- Passada 1: soma dos arredondamentos, para achar a sobra de centavos.
  for v_part in
    select quantidade from coletiva_participacoes where coletiva_id = v_col.id
  loop
    v_soma := v_soma + round(v_unit * v_part.quantidade, 2);
    v_frete_soma := v_frete_soma
      + round(v_frete_total * v_part.quantidade / v_col.qtd_atual, 2);
  end loop;
  v_delta := v_total - v_soma;
  v_frete_delta := v_frete_total - v_frete_soma;

  perform set_config('app.checkout_rpc', 'on', true);

  -- Passada 2: gera um pedido por participante; a sobra vai no maior.
  for v_part in
    select * from coletiva_participacoes
    where coletiva_id = v_col.id
    order by quantidade desc, created_at asc
  loop
    v_valor := round(v_unit * v_part.quantidade, 2);
    v_frete := round(v_frete_total * v_part.quantidade / v_col.qtd_atual, 2);
    if v_primeiro then
      v_valor := v_valor + v_delta;
      v_frete := v_frete + v_frete_delta;
      v_primeiro := false;
    end if;

    -- ponytail: sem guard de pedido_id — só chegamos aqui com a coletiva
    -- Aberta/Viavel, e status Atingida sai antes por idempotência.
    insert into pedidos (id_venda, loja_id, cliente_id, data, status_pedido,
                         valor_pedido, forma_pagamento)
    values (upper(substr(md5(random()::text), 1, 10)), v_col.loja_id,
            v_part.user_id, now(), 'Aguardando Pagamento',
            v_valor + v_frete, 'PIX')
    returning id into v_pedido;

    insert into linha_itens (pedido_id, produto_id, produto_nome, quantidade,
      valor, repasse_ind, repasse_afiliado, retirar_na_loja, valor_frete,
      entrega_cep, entrega_rua, entrega_numero, entrega_bairro,
      entrega_cidade, entrega_complemento)
    values (v_pedido, v_prod.id, v_prod.nome, v_part.quantidade,
      v_valor, round(v_valor * 0.05, 2), 0,
      not v_col.frete_conjunto,
      case when v_col.frete_conjunto then v_frete else null end,
      v_col.entrega_cep, v_col.entrega_rua, v_col.entrega_numero,
      v_col.entrega_bairro, v_col.entrega_cidade, v_col.entrega_complemento);

    update coletiva_participacoes set pedido_id = v_pedido where id = v_part.id;
  end loop;

  update produtos set estoque_atual = estoque_atual - v_col.qtd_atual
  where id = v_prod.id;

  update compras_coletivas
  set status = 'Atingida', valor_unitario = v_unit, fechada_em = now()
  where id = v_col.id;

  perform coletiva_evento(v_col.id, 'fechada',
    jsonb_build_object('valor_unitario', v_unit, 'total', v_total,
                       'frete_total', v_frete_total, 'participantes', v_participantes,
                       'qtd_atual', v_col.qtd_atual));

  return jsonb_build_object(
    'status', 'Atingida',
    'fechou', true,
    'valor_unitario', v_unit,
    'total', v_total,
    'frete_total', v_frete_total,
    'participantes', v_participantes
  );
end;
$$;

-- ============ 5. Participar: acumula e delega o fechamento ============
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
  v_ja boolean;
  v_participantes int;
  v_fecho jsonb;
  v_meu_pedido uuid;
begin
  if v_user is null then
    raise exception 'Faça login para participar da compra coletiva.';
  end if;
  if p_quantidade is null or p_quantidade < 1 then
    raise exception 'Quantidade inválida.';
  end if;

  select * into v_col from compras_coletivas where id = p_coletiva_id for update;
  if not found then
    raise exception 'Compra coletiva não encontrada.';
  end if;
  if v_col.status not in ('Aberta', 'Viavel') then
    raise exception 'Esta compra coletiva não está mais aberta (%).', v_col.status;
  end if;
  if v_col.prazo < now() then
    -- deixa o fechamento decidir entre Expirada e Atingida
    perform coletiva_fechar(p_coletiva_id);
    raise exception 'Esta compra coletiva já encerrou o prazo.';
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

  select exists (
    select 1 from coletiva_participacoes
    where coletiva_id = v_col.id and user_id = v_user
  ) into v_ja;
  select count(*) into v_participantes
  from coletiva_participacoes where coletiva_id = v_col.id;

  if not v_ja and v_col.max_participantes is not null
     and v_participantes >= v_col.max_participantes then
    raise exception 'Esta coletiva já atingiu o máximo de % participantes.',
      v_col.max_participantes;
  end if;

  insert into coletiva_participacoes (coletiva_id, user_id, quantidade)
  values (v_col.id, v_user, p_quantidade)
  on conflict (coletiva_id, user_id)
  do update set quantidade = coletiva_participacoes.quantidade + excluded.quantidade;

  update compras_coletivas
  set qtd_atual = qtd_atual + p_quantidade
  where id = v_col.id
  returning * into v_col;

  perform coletiva_evento(v_col.id, 'participante_entrou',
    jsonb_build_object('quantidade', p_quantidade, 'qtd_atual', v_col.qtd_atual,
                       'novo', not v_ja));

  -- Lote desbloqueado pela entrada deste participante (marco = min_qtd do lote).
  perform coletiva_evento(v_col.id, 'lote_desbloqueado',
    jsonb_build_object('marco', (elem->>'min_qtd'),
                       'valor_unitario', (elem->>'valor_unitario'),
                       'qtd_atual', v_col.qtd_atual))
  from jsonb_array_elements(v_col.lotes) elem
  where (elem->>'min_qtd')::int <= v_col.qtd_atual;

  -- Avalia viabilidade e os gatilhos de fechamento (lote final / lotação).
  v_fecho := coletiva_fechar(v_col.id);

  select pedido_id into v_meu_pedido from coletiva_participacoes
  where coletiva_id = v_col.id and user_id = v_user;

  return jsonb_build_object(
    'status', v_fecho->>'status',
    'qtd_atual', v_col.qtd_atual,
    'meta_qtd', v_col.meta_qtd,
    'preco_atual', coletiva_preco_lote(v_col.lotes, v_col.qtd_atual, v_col.preco_base),
    'pedido_id', v_meu_pedido
  );
end;
$$;

revoke all on function public.coletiva_criar(uuid, int, int, jsonb) from public;
grant execute on function public.coletiva_criar(uuid, int, int, jsonb) to authenticated;
revoke all on function public.coletiva_participar(uuid, int) from public;
grant execute on function public.coletiva_participar(uuid, int) to authenticated;
revoke all on function public.coletiva_fechar(uuid, boolean) from public;
grant execute on function public.coletiva_fechar(uuid, boolean) to authenticated;
grant execute on function public.coletiva_preco_lote(jsonb, int, numeric) to authenticated, anon;

-- A assinatura antiga (3 args) sai de cena para não conviverem duas versões.
drop function if exists public.coletiva_criar(uuid, int, int);
