-- RLS do fluxo de frete: feed de corridas (exclusividade do afiliado logístico)
-- e visibilidade de lotes/manifesto (0074). Roda em transação com ROLLBACK.
--
--   supabase db query --linked --file supabase/tests/rls_frete_corridas_lotes.sql
--
-- IMPORTANTE: o runner do CLI é superuser e BYPASSA RLS — por isso cada
-- checagem roda dentro de `set local role authenticated`. Sem isso o teste
-- passa/falha por acidente (foi o que aconteceu no QA de 23/07).
-- Atores e produto são ids reais de produção; nada é commitado.
begin;

create temp table qa_ids (rotulo text, id uuid);
create temp table qa_res (etapa text, ok boolean, detalhe text);
grant all on qa_res, qa_ids to authenticated;

-- pedido + corrida com exclusividade viva (afiliado logístico da loja)
select set_config('request.jwt.claims',
  '{"sub":"e7ea5a61-e0b7-45e1-9407-f60a558f8779","role":"authenticated"}', true);

insert into qa_ids
select 'pedido', public.checkout_criar_pedido(
  '[{"produto_id":"57194709-9199-47d9-914a-b223e4e43af1","quantidade":10}]'::jsonb,
  '{"tipo":"entrega","cep":"69010-500","rua":"QA RLS","numero":"1","bairro":"Centro","cidade":"Manaus","complemento":""}'::jsonb,
  'PIX', null, false);

update pedidos set status_pedido = 'Pagamento Realizado' where id = (select id from qa_ids where rotulo='pedido');

insert into qa_ids
select 'corrida', public.despachar_corrida_automatica((select id from qa_ids where rotulo='pedido'));

-- 1) parceiro de plataforma NÃO deve ver durante a exclusividade
select set_config('request.jwt.claims',
  '{"sub":"ec256912-bd52-42eb-81b1-bb9e455efdcd","role":"authenticated"}', true);
set local role authenticated;
insert into qa_res
select 'RLS 1. parceiro NAO ve durante a exclusividade de 5min',
       count(*) = 0, count(*)::text
from corridas where id = (select id from qa_ids where rotulo='corrida');
reset role;

-- 2) afiliado exclusivo VÊ
select set_config('request.jwt.claims',
  '{"sub":"89c96854-8065-43d9-887d-02b21c0c809a","role":"authenticated"}', true);
set local role authenticated;
insert into qa_res
select 'RLS 2. afiliado logistico exclusivo VE a corrida', count(*) = 1, count(*)::text
from corridas where id = (select id from qa_ids where rotulo='corrida');
reset role;

-- 3) expirada a janela, o pool passa a ver
update corridas set exclusividade_fim = now() - interval '1 minute'
where id = (select id from qa_ids where rotulo='corrida');

select set_config('request.jwt.claims',
  '{"sub":"ec256912-bd52-42eb-81b1-bb9e455efdcd","role":"authenticated"}', true);
set local role authenticated;
insert into qa_res
select 'RLS 3. expirada a janela, parceiro passa a ver no feed', count(*) = 1, count(*)::text
from corridas where id = (select id from qa_ids where rotulo='corrida');

-- 4) comprador aleatório (nem solicitante, nem parceiro, nem admin) NÃO vê
reset role;
select set_config('request.jwt.claims',
  '{"sub":"aeafa241-bc42-4bcd-a96b-9a8cba86e38b","role":"authenticated"}', true);
set local role authenticated;
insert into qa_res
select 'RLS 4. usuario sem papel logistico NAO ve a corrida', count(*) = 0, count(*)::text
from corridas where id = (select id from qa_ids where rotulo='corrida');
reset role;

-- 5) lote e manifesto: admin vê; parceiro da corrida vê; terceiro não
insert into qa_ids
select 'pedido_c1', public.checkout_criar_pedido(
  '[{"produto_id":"57194709-9199-47d9-914a-b223e4e43af1","quantidade":10}]'::jsonb,
  '{"tipo":"entrega","cep":"69011-000","rua":"QA RLS C1","numero":"2","bairro":"Centro","cidade":"Manaus","complemento":""}'::jsonb,
  'PIX', null, true)
from (select set_config('request.jwt.claims',
  '{"sub":"e7ea5a61-e0b7-45e1-9407-f60a558f8779","role":"authenticated"}', true)) _;

insert into qa_ids
select 'pedido_c2', public.checkout_criar_pedido(
  '[{"produto_id":"57194709-9199-47d9-914a-b223e4e43af1","quantidade":10}]'::jsonb,
  '{"tipo":"entrega","cep":"69012-000","rua":"QA RLS C2","numero":"3","bairro":"Centro","cidade":"Manaus","complemento":""}'::jsonb,
  'PIX', null, true);

update pedidos set status_pedido = 'Pagamento Realizado'
where id in (select id from qa_ids where rotulo in ('pedido_c1','pedido_c2'));

insert into qa_ids
select 'lote', public.criar_lote_consolidacao(array[
  (select id from qa_ids where rotulo='pedido_c1'),
  (select id from qa_ids where rotulo='pedido_c2')]);

-- terceiro sem papel não vê o lote
select set_config('request.jwt.claims',
  '{"sub":"aeafa241-bc42-4bcd-a96b-9a8cba86e38b","role":"authenticated"}', true);
set local role authenticated;
insert into qa_res
select 'RLS 5. usuario sem papel NAO ve o lote nem o manifesto',
       (select count(*) from lotes_consolidacao where id = (select id from qa_ids where rotulo='lote')) = 0
       and (select count(*) from lote_pedidos where lote_id = (select id from qa_ids where rotulo='lote')) = 0,
       'ok';
reset role;

-- admin vê o lote (é quem opera /admin/lotes)
select set_config('request.jwt.claims',
  '{"sub":"e7ea5a61-e0b7-45e1-9407-f60a558f8779","role":"authenticated"}', true);
set local role authenticated;
insert into qa_res
select 'RLS 6. admin ve o lote em /admin/lotes',
       (select count(*) from lotes_consolidacao where id = (select id from qa_ids where rotulo='lote')) = 1, 'ok';
reset role;

-- transportador que aceitou o manifesto vê o lote (RLS da 0074)
update corridas set exclusividade_fim = now() - interval '1 minute'
where id = (select corrida_id from lotes_consolidacao where id = (select id from qa_ids where rotulo='lote'));

select set_config('request.jwt.claims',
  '{"sub":"ec256912-bd52-42eb-81b1-bb9e455efdcd","role":"authenticated"}', true);
select public.aceitar_corrida((select corrida_id from lotes_consolidacao where id = (select id from qa_ids where rotulo='lote')));
set local role authenticated;
insert into qa_res
select 'RLS 7. transportador que aceitou VE o lote e os pedidos do manifesto',
       (select count(*) from lotes_consolidacao where id = (select id from qa_ids where rotulo='lote')) = 1
       and (select count(*) from lote_pedidos where lote_id = (select id from qa_ids where rotulo='lote')) = 2,
       'ok';
reset role;

select * from qa_res order by etapa;
rollback;
