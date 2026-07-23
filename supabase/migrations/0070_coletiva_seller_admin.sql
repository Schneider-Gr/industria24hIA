-- Administração da compra coletiva no painel do seller + correção de preço.
--
-- 1) BUG: coletiva_criar aceitava faixa com valor_unitario >= preço base
--    (dado real: Alface crespa tem 1ª faixa R$6,05 com base R$2,00) — a
--    "coletiva" cobraria MAIS caro que comprar direto. Agora a faixa
--    elegível precisa dar desconto real.
-- 2) RPC coletiva_cancelar: dono da loja cancela coletiva Aberta do seu
--    produto (ninguém pagou nada ainda — cancelar é só marcar status).
-- 3) Policy de leitura das participações para o dono da loja (painel
--    mostra quem participa e os pedidos gerados).

-- ============ 1. coletiva_criar: faixa só vale com desconto real ============
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

-- ============ 2. Cancelar (dono da loja) ============
create or replace function public.coletiva_cancelar(
  p_coletiva_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_col record;
begin
  if v_user is null then
    raise exception 'Faça login.';
  end if;

  select c.*, l.owner_id into v_col
  from compras_coletivas c
  join lojas l on l.id = c.loja_id
  where c.id = p_coletiva_id
  for update of c;
  if not found then
    raise exception 'Compra coletiva não encontrada.';
  end if;
  if v_col.owner_id <> v_user then
    raise exception 'Apenas o dono da loja pode cancelar esta coletiva.';
  end if;
  if v_col.status <> 'Aberta' then
    raise exception 'Só é possível cancelar uma coletiva Aberta (atual: %).', v_col.status;
  end if;

  update compras_coletivas set status = 'Cancelada' where id = p_coletiva_id;
end;
$$;

revoke all on function public.coletiva_cancelar(uuid) from public;
grant execute on function public.coletiva_cancelar(uuid) to authenticated;

-- ============ 3. Dono da loja lê as participações das suas coletivas ============
drop policy if exists participacoes_loja_read on public.coletiva_participacoes;
create policy participacoes_loja_read on public.coletiva_participacoes
  for select using (
    exists (
      select 1
      from public.compras_coletivas c
      join public.lojas l on l.id = c.loja_id
      where c.id = coletiva_id and l.owner_id = auth.uid()
    )
  );
