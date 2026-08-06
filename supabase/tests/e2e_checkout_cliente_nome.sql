-- 0107: pedidos.cliente_nome era sempre null (checkout capturava `nome` do
-- form mas nunca gravava). Confirma que o overload de 6 args de
-- checkout_criar_pedido grava cliente_nome, e que null/"" continua deixando
-- a coluna null (sem regressão pra quem não manda nome, ex. retirada sem Asaas).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000c1', 'e2e-nome@test.local');

insert into public.lojas (id, owner_id, nome, cep, rua, numero, cidade, estado)
values ('00000000-0000-4000-8000-0000000000ca', '00000000-0000-4000-8000-0000000000c1',
        'Loja E2E Nome', '69000000', 'Rua A', '1', 'Manaus', 'AM');
update public.lojas set situacao = 'Ativa', permite_retirada_na_loja = true
where id = '00000000-0000-4000-8000-0000000000ca';

insert into public.produtos (id, loja_id, nome, valor, estoque_atual, status_produto)
values ('00000000-0000-4000-8000-0000000000cb', '00000000-0000-4000-8000-0000000000ca',
        'Prod Nome', 50.00, 10, 'Aprovado');

create temp table r (nome text, ok boolean, detalhe text);

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-0000000000c1', 'role', 'authenticated')::text, true);

-- 1) cliente_nome preenchido -----------------------------------------
create temp table t1 as
select public.checkout_criar_pedido(
  '[{"produto_id":"00000000-0000-4000-8000-0000000000cb","quantidade":1}]'::jsonb,
  '{"tipo":"retirada"}'::jsonb,
  'PIX', null, false, 'Fulano de Tal') as pedido_id;

insert into r
select 'cliente_nome gravado', (select cliente_nome from pedidos where id = (select pedido_id from t1)) = 'Fulano de Tal',
  (select cliente_nome from pedidos where id = (select pedido_id from t1))::text;

-- 2) sem nome (null) — não quebra e não escreve string vazia ----------
create temp table t2 as
select public.checkout_criar_pedido(
  '[{"produto_id":"00000000-0000-4000-8000-0000000000cb","quantidade":1}]'::jsonb,
  '{"tipo":"retirada"}'::jsonb,
  'PIX', null, false, null) as pedido_id;

insert into r
select 'sem nome fica null', (select cliente_nome from pedidos where id = (select pedido_id from t2)) is null,
  coalesce((select cliente_nome from pedidos where id = (select pedido_id from t2)), '<null>');

select * from r order by nome;
select bool_and(ok) as tudo_ok from r;

rollback;
