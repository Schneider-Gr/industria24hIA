-- QA transacional da migration 0058 (repasse PIX automático). Roda inteiro
-- em uma transação e dá ROLLBACK no final — não deixa rastro no banco.
-- Rodar: npx supabase db query --linked --file supabase/qa/qa_repasses.sql
-- Sucesso = última linha "QA REPASSES: TODOS OS TESTES PASSARAM".

begin;

do $$
declare
  v_seller uuid := gen_random_uuid();
  v_afiliado uuid := gen_random_uuid();
  v_comprador uuid := gen_random_uuid();
  v_loja uuid;
  v_pedido uuid;
  v_rep record;
  v_cnt int;
  v_seller_valor numeric;
  v_ok boolean;
begin
  -- 0. objetos existem
  if to_regclass('public.repasses') is null then raise exception 'FALHA: repasses nao existe'; end if;
  if to_regclass('public.afiliados_chave_pix') is null then raise exception 'FALHA: afiliados_chave_pix nao existe'; end if;
  if not exists (select 1 from pg_proc where proname='calcular_repasses_pedido') then raise exception 'FALHA: RPC calcular_repasses_pedido nao existe'; end if;
  if not exists (select 1 from pg_proc where proname='revalidar_repasse') then raise exception 'FALHA: RPC revalidar_repasse nao existe'; end if;
  raise notice 'OK 0: objetos da 0058 existem';

  -- fixtures (como postgres/service: guard e RLS liberam)
  insert into auth.users (id, email) values
    (v_seller, 'qa-rep-seller@teste.com'),
    (v_afiliado, 'qa-rep-afiliado@teste.com'),
    (v_comprador, 'qa-rep-comprador@teste.com');

  insert into lojas (owner_id, nome, chave_pix, tipo_chave_pix, chave_pix_confirmada_em)
  values (v_seller, 'QA Loja Repasse', 'qa-rep-loja@teste.com', 'EMAIL', now() - interval '25 hours')
  returning id into v_loja;

  insert into pedidos (id_venda, loja_id, cliente_id, data, status_pedido, valor_pedido, forma_pagamento, dt_pagamento)
  values ('QAREP00001', v_loja, v_comprador, now(), 'Pagamento Realizado', 330, 'PIX', now())
  returning id into v_pedido;

  -- item 1: 200 de itens, 10 repasse_ind (5%), 20 afiliado (10%), frete 30
  insert into linha_itens (pedido_id, produto_nome, quantidade, valor, repasse_ind, repasse_afiliado, afiliado_id, valor_frete, pago)
  values (v_pedido, 'QA Produto A', 2, 200, 10, 20, v_afiliado, 30, true);
  -- item 2: 100 de itens, 5 repasse_ind, sem afiliado, retirada (frete null)
  insert into linha_itens (pedido_id, produto_nome, quantidade, valor, repasse_ind, repasse_afiliado, valor_frete, pago)
  values (v_pedido, 'QA Produto B', 1, 100, 5, 0, null, true);

  -- 1. cálculo: seller = 300 - 15 - 20 + 30 = 295; afiliado = 20 (sem chave → inelegivel)
  perform calcular_repasses_pedido(v_pedido);

  select valor into v_seller_valor from repasses where pedido_id = v_pedido and destino = 'seller';
  if v_seller_valor is distinct from 295.00 then
    raise exception 'FALHA: valor do seller esperado 295, veio %', v_seller_valor;
  end if;
  select status into v_rep from repasses where pedido_id = v_pedido and destino = 'seller';
  if v_rep.status <> 'pendente' then
    raise exception 'FALHA: repasse seller com chave elegivel deveria ser pendente, veio %', v_rep.status;
  end if;
  raise notice 'OK 1: seller = itens - 5%% - afiliado + frete (295) e pendente';

  select valor, status into v_rep from repasses where pedido_id = v_pedido and destino = 'afiliado' and afiliado_id = v_afiliado;
  if not found then raise exception 'FALHA: repasse do afiliado nao criado'; end if;
  if v_rep.valor is distinct from 20.00 then raise exception 'FALHA: valor afiliado esperado 20, veio %', v_rep.valor; end if;
  if v_rep.status <> 'inelegivel' then raise exception 'FALHA: afiliado sem chave deveria ser inelegivel, veio %', v_rep.status; end if;
  raise notice 'OK 2: afiliado = soma repasse_afiliado (20), inelegivel sem chave';

  -- 3. idempotência: re-chamada não duplica (webhook re-entrega eventos)
  perform calcular_repasses_pedido(v_pedido);
  select count(*) into v_cnt from repasses where pedido_id = v_pedido;
  if v_cnt <> 2 then raise exception 'FALHA: re-calculo duplicou repasses (%)', v_cnt; end if;
  raise notice 'OK 3: recalculo idempotente (2 repasses)';

  -- 4. chave do afiliado em carência continua inelegível; confirmada há 25h vira pendente
  insert into afiliados_chave_pix (user_id, chave_pix, tipo_chave_pix, chave_pix_confirmada_em)
  values (v_afiliado, 'qa-rep-afiliado@teste.com', 'EMAIL', now());  -- confirmada AGORA = em carência
  select r.* into v_rep from revalidar_repasse((select id from repasses where pedido_id = v_pedido and destino = 'afiliado')) r;
  if v_rep.status <> 'inelegivel' then raise exception 'FALHA: chave em carencia deveria seguir inelegivel, veio %', v_rep.status; end if;

  update afiliados_chave_pix set chave_pix_confirmada_em = now() - interval '25 hours' where user_id = v_afiliado;
  select r.* into v_rep from revalidar_repasse((select id from repasses where pedido_id = v_pedido and destino = 'afiliado')) r;
  if v_rep.status <> 'pendente' then raise exception 'FALHA: chave elegivel deveria voltar a pendente, veio %', v_rep.status; end if;
  if v_rep.chave_pix <> 'qa-rep-afiliado@teste.com' then raise exception 'FALHA: revalidar nao re-snapshotou a chave'; end if;
  raise notice 'OK 4: carencia 24h do afiliado + revalidar_repasse re-snapshota';

  -- 5. trigger espelho: repasse seller transferido marca linha_itens.transferido
  update repasses set status = 'transferido', asaas_transfer_id = 'qa_tr_1', transferido_em = now()
  where pedido_id = v_pedido and destino = 'seller';
  select bool_and(transferido) into v_ok from linha_itens where pedido_id = v_pedido;
  if not v_ok then raise exception 'FALHA: trigger nao espelhou transferido em linha_itens'; end if;
  raise notice 'OK 5: trigger espelha transferido em linha_itens';

  -- 6. pedido não pago é rejeitado
  update pedidos set dt_pagamento = null where id = v_pedido;
  begin
    perform calcular_repasses_pedido(v_pedido);
    raise exception 'FALHA: calculou repasse de pedido nao pago';
  exception when others then
    if sqlerrm not like '%não pago%' and sqlerrm not like '%nao pago%' then raise; end if;
  end;
  raise notice 'OK 6: pedido nao pago rejeitado';

  raise notice 'QA REPASSES: TODOS OS TESTES PASSARAM';
end;
$$;

rollback;
