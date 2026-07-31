-- E2E do "requer revisão do afiliado" (0095) em begin/rollback.
-- Verifica: produto parceiro_logistico_habilitado marca a corrida como
-- requer_revisao_afiliado; aceitar_corrida bloqueia o afiliado exclusivo
-- enquanto pendente de revisão; revisar_corrida_afiliado grava peso/volume/
-- janela/descrição e libera o aceite; sem produto marcado, comportamento
-- idêntico ao de hoje (não pede revisão).
begin;

-- seeds ----------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000201', 'e2e-r-comprador@test.local'),
  ('00000000-0000-4000-8000-000000000202', 'e2e-r-afiliado@test.local'),
  ('00000000-0000-4000-8000-00000000020f', 'e2e-r-seller@test.local');

insert into public.lojas (id, owner_id, nome, cep, rua, numero, cidade, estado)
values ('00000000-0000-4000-8000-0000000002aa', '00000000-0000-4000-8000-00000000020f',
        'Loja E2E Revisao', '69000000', 'Rua A', '1', 'Manaus', 'AM');
update public.lojas set situacao = 'Ativa', permite_retirada_na_loja = true
  where id = '00000000-0000-4000-8000-0000000002aa';

-- prod que exige revisão e prod normal (sem exigir)
insert into public.produtos (id, loja_id, nome, valor, estoque_atual, status_produto, permite_logistica_afiliado, parceiro_logistico_habilitado)
values
  ('00000000-0000-4000-8000-0000000002b1'::uuid, '00000000-0000-4000-8000-0000000002aa', 'ExigeRevisao', 100.00, 50, 'Aprovado', true, true),
  ('00000000-0000-4000-8000-0000000002b2'::uuid, '00000000-0000-4000-8000-0000000002aa', 'Normal', 100.00, 50, 'Aprovado', true, false);

-- afiliado logístico aprovado da loja
insert into public.afiliacoes (afiliado_id, loja_id, tipo, status, porcentagem)
values ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-0000000002aa', 'logistica', 'Aprovada', 5);

insert into public.faixas_cep (cep_inicial, cep_final, percentual, ativo)
values (69000000, 69099999, 10, true)
on conflict do nothing;

create temp table r (nome text, ok boolean, detalhe text);

-- 1) pedido com produto que exige revisão -> corrida nasce requer_revisao_afiliado = true
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-000000000201', 'role', 'authenticated')::text, true);

create temp table t1 as
select public.checkout_criar_pedido(
  '[{"produto_id":"00000000-0000-4000-8000-0000000002b1","quantidade":1}]'::jsonb,
  '{"tipo":"entrega","cep":"69010-000","rua":"R","numero":"1","bairro":"B","cidade":"Manaus","complemento":""}'::jsonb,
  'PIX', null, false) as pedido_id;

create temp table c1 as
select public.despachar_corrida_automatica((select pedido_id from t1)) as corrida_id;

insert into r
select 'produto exige revisão: corrida nasce requer_revisao_afiliado = true',
       c.requer_revisao_afiliado = true,
       c.requer_revisao_afiliado::text
from corridas c join c1 on c.id = c1.corrida_id;

-- 2) afiliado tenta aceitar sem revisar -> bloqueado ---------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-000000000202', 'role', 'authenticated')::text, true);

do $$
declare
  v_corrida_id uuid;
  v_bloqueado boolean := false;
begin
  select corrida_id into v_corrida_id from c1;
  begin
    perform public.aceitar_corrida(v_corrida_id);
  exception when others then
    v_bloqueado := true;
  end;
  insert into r values ('aceitar sem revisar: lança exceção', v_bloqueado, v_bloqueado::text);
end $$;

-- 3) afiliado revisa -> requer_revisao_afiliado vira false, dados gravados
select public.revisar_corrida_afiliado(
  (select corrida_id from c1), 12.5, 0.8,
  now(), now() + interval '2 hours', 'Caixas empilhadas, frágil');

insert into r
select 'após revisar: requer_revisao_afiliado = false e peso gravado',
       c.requer_revisao_afiliado = false and c.peso_kg = 12.5,
       format('requer=%s peso=%s', c.requer_revisao_afiliado, c.peso_kg)
from corridas c join c1 on c.id = c1.corrida_id;

-- 4) afiliado aceita depois de revisar -> OK ------------------------------
do $$
declare
  v_corrida_id uuid;
  v_ok boolean := false;
begin
  select corrida_id into v_corrida_id from c1;
  perform public.aceitar_corrida(v_corrida_id);
  v_ok := true;
  insert into r values ('aceitar após revisar: sucede', v_ok, 'ok');
end $$;

-- 5) pedido SEM produto marcado -> corrida nasce requer_revisao_afiliado = false
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-000000000201', 'role', 'authenticated')::text, true);

create temp table t2 as
select public.checkout_criar_pedido(
  '[{"produto_id":"00000000-0000-4000-8000-0000000002b2","quantidade":1}]'::jsonb,
  '{"tipo":"entrega","cep":"69010-000","rua":"R","numero":"1","bairro":"B","cidade":"Manaus","complemento":""}'::jsonb,
  'PIX', null, false) as pedido_id;

create temp table c2 as
select public.despachar_corrida_automatica((select pedido_id from t2)) as corrida_id;

insert into r
select 'sem produto marcado: requer_revisao_afiliado = false (comportamento de hoje)',
       c.requer_revisao_afiliado = false,
       c.requer_revisao_afiliado::text
from corridas c join c2 on c.id = c2.corrida_id;

-- resultado ------------------------------------------------------------
select nome, ok, detalhe from r order by nome;
select case when bool_and(ok) then 'TODOS PASSARAM' else 'FALHOU' end as resultado from r;

rollback;
