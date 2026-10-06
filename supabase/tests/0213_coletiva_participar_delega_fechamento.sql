-- Teste da 0213: rode com `supabase db query --linked --file`. Tudo em transacao, rollback no fim.
-- Cobre: meta batida sem minimo de participantes (segue Aberta), meta + minimo (vira Viavel, sem pedido),
-- ultimo lote (fecha, todos pagam o melhor lote), teto de participantes e coletiva sem lotes (fecha na meta).
begin;
do $$
declare
  v_prod record; v_u1 uuid; v_u2 uuid; v_u3 uuid; v_u4 uuid;
  v_col uuid; v_col2 uuid; v_col3 uuid; v_r jsonb; v_n int; v_status text;
  v_p90 numeric(12,2); v_p80 numeric(12,2); v_estoque_antes numeric; v_estoque_depois numeric; v_soma numeric;
  v_barrou boolean;
begin
  select p.id, p.loja_id, p.valor, p.estoque_atual, l.owner_id into v_prod
    from public.produtos p join public.lojas l on l.id = p.loja_id
   where p.status_produto = 'Aprovado' and l.situacao = 'Ativa'
     and p.estoque_atual >= 40 and p.valor >= 1
     and coalesce(l.valor_pedido_minimo, 0) <= p.valor * 4
     and not exists (select 1 from public.compras_coletivas c where c.produto_id = p.id and c.status in ('Aberta', 'Viavel'))
   order by p.estoque_atual desc limit 1;
  if v_prod.id is null then raise exception 'TESTE INVALIDO: sem produto elegivel'; end if;

  select min(id::text) filter (where rn = 1)::uuid, min(id::text) filter (where rn = 2)::uuid,
         min(id::text) filter (where rn = 3)::uuid, min(id::text) filter (where rn = 4)::uuid
    into v_u1, v_u2, v_u3, v_u4
    from (select id, row_number() over (order by created_at) rn from auth.users where id <> v_prod.owner_id) u;
  if v_u4 is null then raise exception 'TESTE INVALIDO: precisa de 4 usuarios'; end if;

  v_p90 := round(v_prod.valor * 0.9, 2); v_p80 := round(v_prod.valor * 0.8, 2);

  insert into public.compras_coletivas (produto_id, loja_id, criador_id, meta_qtd, valor_unitario, preco_base, prazo,
                                        lotes, min_participantes, max_participantes)
  values (v_prod.id, v_prod.loja_id, v_u1, 10, v_p90, v_prod.valor, now() + interval '3 days',
          jsonb_build_array(jsonb_build_object('min_qtd', 10, 'valor_unitario', v_p90),
                            jsonb_build_object('min_qtd', 30, 'valor_unitario', v_p80)), 2, 3)
  returning id into v_col;

  -- CASO A: u1 sozinho bate a meta -> continua Aberta, sem pedido (minimo de 2 participantes)
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_u1, 'role', 'authenticated')::text, true);
  v_r := public.coletiva_participar(v_col, 10);
  select status into v_status from public.compras_coletivas where id = v_col;
  select count(*) into v_n from public.coletiva_participacoes where coletiva_id = v_col and pedido_id is not null;
  if v_status <> 'Aberta' or v_n <> 0 or v_r->>'pedido_id' is not null then
    raise exception 'FALHOU A: status %, pedidos %, retorno %', v_status, v_n, v_r;
  end if;

  -- CASO B: u2 entra -> meta + minimo de participantes = Viavel, ainda sem pedido
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_u2, 'role', 'authenticated')::text, true);
  v_r := public.coletiva_participar(v_col, 5);
  select status into v_status from public.compras_coletivas where id = v_col;
  select count(*) into v_n from public.coletiva_participacoes where coletiva_id = v_col and pedido_id is not null;
  if v_status <> 'Viavel' or v_n <> 0 or v_r->>'status' <> 'Viavel' then
    raise exception 'FALHOU B: status %, pedidos %, retorno %', v_status, v_n, v_r;
  end if;

  -- CASO C: u2 aumenta em coletiva Viavel ate o ultimo lote -> fecha, todos pagam o lote de 30
  select estoque_atual into v_estoque_antes from public.produtos where id = v_prod.id;
  v_r := public.coletiva_participar(v_col, 15);
  select status into v_status from public.compras_coletivas where id = v_col;
  select count(*), sum(pe.valor_pedido) into v_n, v_soma
    from public.coletiva_participacoes cp join public.pedidos pe on pe.id = cp.pedido_id where cp.coletiva_id = v_col;
  select estoque_atual into v_estoque_depois from public.produtos where id = v_prod.id;
  if v_status <> 'Atingida' or v_n <> 2 or v_r->>'pedido_id' is null then
    raise exception 'FALHOU C: status %, pedidos %, retorno %', v_status, v_n, v_r;
  end if;
  if v_soma <> round(v_p80 * 30, 2) then
    raise exception 'FALHOU C preco: soma %, esperado % (30 x %)', v_soma, round(v_p80 * 30, 2), v_p80;
  end if;
  if v_estoque_antes - v_estoque_depois <> 30 then
    raise exception 'FALHOU C estoque: % -> %', v_estoque_antes, v_estoque_depois;
  end if;

  -- CASO D: teto de participantes barra o terceiro novo, e coletiva fechada recusa entrada
  insert into public.compras_coletivas (produto_id, loja_id, criador_id, meta_qtd, valor_unitario, preco_base, prazo,
                                        lotes, min_participantes, max_participantes)
  values (v_prod.id, v_prod.loja_id, v_u1, 100, v_p90, v_prod.valor, now() + interval '3 days',
          jsonb_build_array(jsonb_build_object('min_qtd', 100, 'valor_unitario', v_p90),
                            jsonb_build_object('min_qtd', 150, 'valor_unitario', v_p80)), 2, 2)
  returning id into v_col2;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_u1, 'role', 'authenticated')::text, true);
  perform public.coletiva_participar(v_col2, 1);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_u3, 'role', 'authenticated')::text, true);
  perform public.coletiva_participar(v_col2, 1);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_u4, 'role', 'authenticated')::text, true);
  v_barrou := false;
  begin
    perform public.coletiva_participar(v_col2, 1);
  exception when others then
    v_barrou := sqlerrm like '%máximo de 2 participantes%';
  end;
  if not v_barrou then raise exception 'FALHOU D: quarto usuario entrou acima do teto'; end if;
  v_barrou := false;
  begin
    perform public.coletiva_participar(v_col, 1);
  exception when others then
    v_barrou := sqlerrm like '%não está mais aberta%';
  end;
  if not v_barrou then raise exception 'FALHOU D: coletiva Atingida aceitou entrada'; end if;

  -- CASO E: coletiva sem lotes (assinatura antiga de coletiva_criar) continua fechando na meta
  update public.compras_coletivas set status = 'Cancelada' where id = v_col2;
  insert into public.compras_coletivas (produto_id, loja_id, criador_id, meta_qtd, valor_unitario, preco_base, prazo,
                                        min_participantes)
  values (v_prod.id, v_prod.loja_id, v_u1, 5, v_p90, v_prod.valor, now() + interval '3 days', 1)
  returning id into v_col3;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_u3, 'role', 'authenticated')::text, true);
  v_r := public.coletiva_participar(v_col3, 5);
  select status into v_status from public.compras_coletivas where id = v_col3;
  if v_status <> 'Atingida' or v_r->>'pedido_id' is null then
    raise exception 'FALHOU E: status %, retorno %', v_status, v_r;
  end if;

  raise notice 'OK 0213: A, B, C, D e E passaram';
end $$;
rollback;
