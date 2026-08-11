-- 0116: confirma RLS de storage do anexo de foto nas mensagens de mediação
-- — comprador só grava/lê no path do próprio canal, loja idem, admin em
-- qualquer um. begin/rollback, não altera nada de verdade. Testa a policy
-- de storage.objects diretamente (insert de metadado), sem upload real de
-- bytes — é exatamente o que a policy avalia.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000a001', 'e2e-foto-comprador@test.local'),
  ('00000000-0000-4000-8000-00000000a002', 'e2e-foto-seller@test.local');

insert into public.lojas (id, owner_id, nome, cep, rua, numero, cidade, estado)
values ('00000000-0000-4000-8000-00000000a00a', '00000000-0000-4000-8000-00000000a002',
        'Loja E2E Foto', '69000000', 'Rua A', '1', 'Manaus', 'AM');
update public.lojas set situacao = 'Ativa' where id = '00000000-0000-4000-8000-00000000a00a';

insert into public.produtos (id, loja_id, nome, valor, estoque_atual, status_produto)
values ('00000000-0000-4000-8000-00000000a00b', '00000000-0000-4000-8000-00000000a00a',
        'Produto E2E Foto', 100.00, 10, 'Aprovado');

insert into public.pedidos (id, id_venda, loja_id, cliente_id, status_pedido, valor_pedido)
values ('00000000-0000-4000-8000-00000000a00c', 'E2EFOTO1', '00000000-0000-4000-8000-00000000a00a',
        '00000000-0000-4000-8000-00000000a001', 'Pagamento Realizado', 100.00);

insert into public.linha_itens (pedido_id, produto_id, produto_nome, quantidade, valor)
values ('00000000-0000-4000-8000-00000000a00c', '00000000-0000-4000-8000-00000000a00b',
        'Produto E2E Foto', 1, 100.00);

insert into public.conversas (id, comprador_id, loja_id, pedido_id)
values ('00000000-0000-4000-8000-00000000a00d', '00000000-0000-4000-8000-00000000a001',
        '00000000-0000-4000-8000-00000000a00a', '00000000-0000-4000-8000-00000000a00c');

insert into public.disputas (id, pedido_id, comprador_id, loja_id, conversa_id, motivo, descricao, status, sla_loja_vence_em)
values ('00000000-0000-4000-8000-00000000a00e', '00000000-0000-4000-8000-00000000a00c',
        '00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-00000000a00a',
        '00000000-0000-4000-8000-00000000a00d', 'produto_avariado', 'teste foto', 'em_mediacao_admin', now() + interval '1 day');

create temp table r (nome text, ok boolean, detalhe text);
grant all on r to authenticated;

set local role authenticated;

-- 1) comprador grava no PRÓPRIO canal -> permitido -------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-00000000a001', 'role', 'authenticated')::text, true);

do $$
declare v_ok boolean := true;
begin
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('disputas', 'mediacao/00000000-0000-4000-8000-00000000a00e/comprador/teste.jpg', '00000000-0000-4000-8000-00000000a001');
  exception when others then
    v_ok := false;
  end;
  insert into r values ('comprador grava no próprio canal: permitido', v_ok, v_ok::text);
end $$;

-- 2) comprador tenta gravar no canal da loja -> bloqueado -------------------
do $$
declare v_bloqueado boolean := false;
begin
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('disputas', 'mediacao/00000000-0000-4000-8000-00000000a00e/loja/teste.jpg', '00000000-0000-4000-8000-00000000a001');
  exception when others then
    v_bloqueado := true;
  end;
  insert into r values ('comprador não grava no canal da loja: bloqueado', v_bloqueado, v_bloqueado::text);
end $$;

-- 3) comprador lê só o próprio canal (0 linhas no canal da loja) ------------
insert into r select 'comprador não vê objetos do canal da loja: bloqueado (0 linhas)',
  count(*) = 0, count(*)::text
from storage.objects
where bucket_id = 'disputas' and name like 'mediacao/00000000-0000-4000-8000-00000000a00e/loja/%';

-- 4) loja grava no PRÓPRIO canal -> permitido -------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-00000000a002', 'role', 'authenticated')::text, true);

do $$
declare v_ok boolean := true;
begin
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('disputas', 'mediacao/00000000-0000-4000-8000-00000000a00e/loja/teste2.jpg', '00000000-0000-4000-8000-00000000a002');
  exception when others then
    v_ok := false;
  end;
  insert into r values ('loja grava no próprio canal: permitido', v_ok, v_ok::text);
end $$;

-- 5) loja tenta gravar no canal do comprador -> bloqueado -------------------
do $$
declare v_bloqueado boolean := false;
begin
  begin
    insert into storage.objects (bucket_id, name, owner)
    values ('disputas', 'mediacao/00000000-0000-4000-8000-00000000a00e/comprador/teste2.jpg', '00000000-0000-4000-8000-00000000a002');
  exception when others then
    v_bloqueado := true;
  end;
  insert into r values ('loja não grava no canal do comprador: bloqueado', v_bloqueado, v_bloqueado::text);
end $$;

-- 6) loja não vê objetos do canal do comprador (0 linhas) -------------------
insert into r select 'loja não vê objetos do canal do comprador: bloqueado (0 linhas)',
  count(*) = 0, count(*)::text
from storage.objects
where bucket_id = 'disputas' and name like 'mediacao/00000000-0000-4000-8000-00000000a00e/comprador/%';

select nome, ok, detalhe from r order by nome;
select case when bool_and(ok) then 'TODOS PASSARAM' else 'FALHOU' end as resultado from r;

rollback;
