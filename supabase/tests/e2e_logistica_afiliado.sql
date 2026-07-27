-- E2E do despacho com afiliado logístico por produto (0079) em begin/rollback.
-- Verifica: produto habilitado dá exclusividade ao afiliado; um item
-- desabilitado no pedido joga a corrida pro pool (afiliado_exclusivo_id null);
-- retirada na loja não gera corrida; idempotência.
begin;

-- seeds ----------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000101', 'e2e-l-comprador@test.local'),
  ('00000000-0000-4000-8000-000000000102', 'e2e-l-afiliado@test.local'),
  ('00000000-0000-4000-8000-00000000010f', 'e2e-l-seller@test.local');

insert into public.lojas (id, owner_id, nome, cep, rua, numero, cidade, estado)
values ('00000000-0000-4000-8000-0000000001aa', '00000000-0000-4000-8000-00000000010f',
        'Loja E2E Log', '69000000', 'Rua A', '1', 'Manaus', 'AM');
update public.lojas set situacao = 'Ativa', permite_retirada_na_loja = true
  where id = '00000000-0000-4000-8000-0000000001aa';

-- prod habilitado (default true) e prod desabilitado
insert into public.produtos (id, loja_id, nome, valor, estoque_atual, status_produto, permite_logistica_afiliado)
values
  ('00000000-0000-4000-8000-0000000001b1'::uuid, '00000000-0000-4000-8000-0000000001aa', 'Hab', 100.00, 50, 'Aprovado', true),
  ('00000000-0000-4000-8000-0000000001b2'::uuid, '00000000-0000-4000-8000-0000000001aa', 'Desab', 200.00, 50, 'Aprovado', false);

-- afiliado logístico aprovado da loja
insert into public.afiliacoes (afiliado_id, loja_id, tipo, status, porcentagem)
values ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-0000000001aa', 'logistica', 'Aprovada', 5);

insert into public.faixas_cep (cep_inicial, cep_final, percentual, ativo)
values (69000000, 69099999, 10, true);

create temp table r (nome text, ok boolean, detalhe text);

-- 1) pedido só com produto habilitado -> afiliado exclusivo preenchido ---
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-000000000101', 'role', 'authenticated')::text, true);

create temp table t1 as
select public.checkout_criar_pedido(
  '[{"produto_id":"00000000-0000-4000-8000-0000000001b1","quantidade":1}]'::jsonb,
  '{"tipo":"entrega","cep":"69010-000","rua":"R","numero":"1","bairro":"B","cidade":"Manaus","complemento":""}'::jsonb,
  'PIX', null, false) as pedido_id;

create temp table c1 as
select public.despachar_corrida_automatica((select pedido_id from t1)) as corrida_id;

insert into r
select 'habilitado: afiliado exclusivo preenchido',
       c.afiliado_exclusivo_id = '00000000-0000-4000-8000-000000000102',
       coalesce(c.afiliado_exclusivo_id::text, 'null')
from corridas c join c1 on c.id = c1.corrida_id;

insert into r
select 'habilitado: idempotente (mesma corrida)',
       public.despachar_corrida_automatica((select pedido_id from t1)) = (select corrida_id from c1),
       'ok';

-- 2) pedido com item DESABILITADO -> corrida no pool (afiliado null) -----
create temp table t2 as
select public.checkout_criar_pedido(
  '[{"produto_id":"00000000-0000-4000-8000-0000000001b1","quantidade":1},
    {"produto_id":"00000000-0000-4000-8000-0000000001b2","quantidade":1}]'::jsonb,
  '{"tipo":"entrega","cep":"69010-000","rua":"R","numero":"1","bairro":"B","cidade":"Manaus","complemento":""}'::jsonb,
  'PIX', null, false) as pedido_id;

create temp table c2 as
select public.despachar_corrida_automatica((select pedido_id from t2)) as corrida_id;

insert into r
select 'desabilitado no pedido: afiliado exclusivo NULL (vai pro pool)',
       c.afiliado_exclusivo_id is null,
       coalesce(c.afiliado_exclusivo_id::text, 'null')
from corridas c join c2 on c.id = c2.corrida_id;

-- 3) retirada na loja -> sem corrida ------------------------------------
create temp table t3 as
select public.checkout_criar_pedido(
  '[{"produto_id":"00000000-0000-4000-8000-0000000001b1","quantidade":1}]'::jsonb,
  '{"tipo":"retirada"}'::jsonb,
  'PIX', null, false) as pedido_id;

insert into r
select 'retirada na loja: nenhuma corrida',
       public.despachar_corrida_automatica((select pedido_id from t3)) is null,
       'ok';

-- resultado ------------------------------------------------------------
select nome, ok, detalhe from r order by nome;
select case when bool_and(ok) then 'TODOS PASSARAM' else 'FALHOU' end as resultado from r;

rollback;
