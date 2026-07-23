-- E2E do fluxo de frete em begin/rollback: checkout individual + consolidado,
-- despacho automático (preço = soma), guard do consolidado, lote e cancelamento.
begin;

-- seeds ----------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'e2e-c1@test.local'),
  ('00000000-0000-4000-8000-000000000002', 'e2e-c2@test.local'),
  ('00000000-0000-4000-8000-00000000000a', 'e2e-admin@test.local'),
  ('00000000-0000-4000-8000-00000000000f', 'e2e-seller@test.local');
insert into public.admins (user_id) values ('00000000-0000-4000-8000-00000000000a');

insert into public.lojas (id, owner_id, nome, cep, rua, numero, cidade, estado)
values ('00000000-0000-4000-8000-0000000000aa', '00000000-0000-4000-8000-00000000000f',
        'Loja E2E', '69000000', 'Rua A', '1', 'Manaus', 'AM');
update public.lojas set situacao = 'Ativa' where id = '00000000-0000-4000-8000-0000000000aa';

insert into public.produtos (id, loja_id, nome, valor, estoque_atual, status_produto)
values
  ('00000000-0000-4000-8000-0000000000b1'::uuid, '00000000-0000-4000-8000-0000000000aa', 'Prod 1', 100.00, 50, 'Aprovado'),
  ('00000000-0000-4000-8000-0000000000b2'::uuid, '00000000-0000-4000-8000-0000000000aa', 'Prod 2', 200.00, 50, 'Aprovado');

insert into public.faixas_cep (cep_inicial, cep_final, percentual, ativo)
values (69000000, 69099999, 10, true);

-- helpers --------------------------------------------------------------
create temp table r (nome text, ok boolean, detalhe text);

-- 1) checkout NÃO consolidado, 2 itens ---------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);

create temp table t1 as
select public.checkout_criar_pedido(
  '[{"produto_id":"00000000-0000-4000-8000-0000000000b1","quantidade":1},
    {"produto_id":"00000000-0000-4000-8000-0000000000b2","quantidade":1}]'::jsonb,
  '{"tipo":"entrega","cep":"69010-000","rua":"R","numero":"1","bairro":"B","cidade":"Manaus","complemento":""}'::jsonb,
  'PIX', null, false) as pedido_id;

insert into r
select 'pedido individual: valor = itens + frete(10%)',
       p.valor_pedido = 330.00, p.valor_pedido::text
from pedidos p join t1 on p.id = t1.pedido_id;

insert into r
select 'pedido individual: nao marcado consolidado',
       not p.frete_consolidado, p.frete_consolidado::text
from pedidos p join t1 on p.id = t1.pedido_id;

-- despacho: preço da corrida = SOMA dos fretes das linhas (10 + 20 = 30)
create temp table c1 as
select public.despachar_corrida_automatica((select pedido_id from t1)) as corrida_id;

insert into r
select 'despacho individual: preco = soma dos fretes (30.00)',
       c.preco_final = 30.00, c.preco_final::text
from corridas c join c1 on c.id = c1.corrida_id;

insert into r
select 'despacho individual: janela de 4h (0048)',
       c.janela_fim between now() + interval '3 hours 59 minutes' and now() + interval '4 hours 1 minute',
       c.janela_fim::text
from corridas c join c1 on c.id = c1.corrida_id;

-- 2) checkout CONSOLIDADO (2 compradores, mesmo corredor) ---------------
create temp table t2 as
select public.checkout_criar_pedido(
  '[{"produto_id":"00000000-0000-4000-8000-0000000000b1","quantidade":2}]'::jsonb,
  '{"tipo":"entrega","cep":"69015-000","rua":"R","numero":"2","bairro":"B","cidade":"Manaus","complemento":""}'::jsonb,
  'PIX', null, true) as pedido_id;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-000000000002', 'role', 'authenticated')::text, true);

create temp table t3 as
select public.checkout_criar_pedido(
  '[{"produto_id":"00000000-0000-4000-8000-0000000000b2","quantidade":1}]'::jsonb,
  '{"tipo":"entrega","cep":"69020-000","rua":"R","numero":"3","bairro":"B","cidade":"Manaus","complemento":""}'::jsonb,
  'PIX', null, true) as pedido_id;

-- p2: itens 200, frete 10% = 20, desconto 30% => frete 14, total 214
insert into r
select 'consolidado: 30% de desconto no frete (total 214.00)',
       p.valor_pedido = 214.00 and p.frete_consolidado, p.valor_pedido::text
from pedidos p join t2 on p.id = t2.pedido_id;

-- valor_pedido bate com soma das linhas (itens + frete) centavo a centavo
insert into r
select 'consolidado: pedido = soma das linhas',
       p.valor_pedido = (select sum(li.valor + coalesce(li.valor_frete, 0)) from linha_itens li where li.pedido_id = p.id),
       p.valor_pedido::text
from pedidos p join t2 on p.id = t2.pedido_id;

-- guard: consolidado NÃO gera corrida individual
insert into r
select 'guard: despacho de consolidado retorna null',
       public.despachar_corrida_automatica((select pedido_id from t2)) is null, '';

-- 3) lote (admin) -------------------------------------------------------
update pedidos set status_pedido = 'Pagamento Realizado'
where id in ((select pedido_id from t2), (select pedido_id from t3));

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-00000000000a', 'role', 'authenticated')::text, true);

create temp table l1 as
select public.criar_lote_consolidacao(array[
  (select pedido_id from t2), (select pedido_id from t3)]) as lote_id;

-- fretes consolidados: p2=14.00, p3=14.00 (200*10%*0.7) => corrida 28.00
insert into r
select 'lote: corrida-manifesto preco = soma dos fretes consolidados (28.00)',
       c.preco_final = 28.00 and c.status = 'Publicada', c.preco_final::text
from lotes_consolidacao l join corridas c on c.id = l.corrida_id
join l1 on l.id = l1.lote_id;

insert into r
select 'lote: 2 pedidos vinculados', count(*) = 2, count(*)::text
from lote_pedidos lp join l1 on lp.lote_id = l1.lote_id;

-- validação: pedido de outro corredor não entra (cep 96xxx)
-- (não testável sem outro pedido; validação de mesma loja/corredor coberta pela RPC)

-- 4) cancelar lote ------------------------------------------------------
select public.cancelar_lote_consolidacao((select lote_id from l1));

insert into r
select 'cancelamento: lote Cancelado + pedidos liberados + corrida Cancelada',
       l.status = 'Cancelado'
       and not exists (select 1 from lote_pedidos lp where lp.lote_id = l.id)
       and (select status from corridas where id = l.corrida_id) = 'Cancelada',
       l.status
from lotes_consolidacao l join l1 on l.id = l1.lote_id;

-- re-lotear depois do cancelamento funciona
create temp table l2 as
select public.criar_lote_consolidacao(array[
  (select pedido_id from t2), (select pedido_id from t3)]) as lote_id;

insert into r
select 're-lotear apos cancelamento funciona', count(*) = 2, count(*)::text
from lote_pedidos lp join l2 on lp.lote_id = l2.lote_id;

-- resultado -------------------------------------------------------------
select * from r;
rollback;
