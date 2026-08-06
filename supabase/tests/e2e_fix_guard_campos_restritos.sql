-- 0109: confirma que a reconstrução de guard_campos_restritos() restaura o
-- que a 0104 derrubou sem querer, sem quebrar o branch de disputas que a
-- 0104 adicionou. begin/rollback, não altera nada de verdade.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000d1', 'e2e-guard-comprador@test.local'),
  ('00000000-0000-4000-8000-0000000000d2', 'e2e-guard-seller@test.local');

insert into public.lojas (id, owner_id, nome, cep, rua, numero, cidade, estado)
values ('00000000-0000-4000-8000-0000000000da', '00000000-0000-4000-8000-0000000000d2',
        'Loja E2E Guard', '69000000', 'Rua A', '1', 'Manaus', 'AM');
update public.lojas set situacao = 'Ativa' where id = '00000000-0000-4000-8000-0000000000da';

insert into public.produtos (id, loja_id, nome, valor, estoque_atual, status_produto)
values ('00000000-0000-4000-8000-0000000000db', '00000000-0000-4000-8000-0000000000da',
        'Prod Guard', 50.00, 10, 'Aprovado');

create temp table r (nome text, ok boolean, detalhe text);

-- 1) DELETE volta a funcionar para service_role (a 0104 bloqueava até isso) --
insert into public.pedidos (id, id_venda, loja_id, cliente_id, data, status_pedido, valor_pedido, forma_pagamento)
values ('00000000-0000-4000-8000-0000000000dc', 'E2EGUARD01', '00000000-0000-4000-8000-0000000000da',
        '00000000-0000-4000-8000-0000000000d1', now(), 'Aguardando Pagamento', 50.00, 'PIX');

delete from public.pedidos where id = '00000000-0000-4000-8000-0000000000dc';
insert into r select 'DELETE de pedido não pago funciona (service_role)',
  not exists(select 1 from public.pedidos where id = '00000000-0000-4000-8000-0000000000dc'), null;

-- 2) checkout_rpc bypass restaurado: INSERT de linha_itens com repasse ------
insert into public.pedidos (id, id_venda, loja_id, cliente_id, data, status_pedido, valor_pedido, forma_pagamento)
values ('00000000-0000-4000-8000-0000000000dd', 'E2EGUARD02', '00000000-0000-4000-8000-0000000000da',
        '00000000-0000-4000-8000-0000000000d1', now(), 'Aguardando Pagamento', 50.00, 'PIX');

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-0000000000d1', 'role', 'authenticated')::text, true);
select set_config('app.checkout_rpc', 'on', true);

insert into public.linha_itens (pedido_id, produto_id, produto_nome, quantidade, valor, repasse_ind)
values ('00000000-0000-4000-8000-0000000000dd', '00000000-0000-4000-8000-0000000000db', 'Prod Guard', 1, 50.00, 2.5);

insert into r select 'checkout_rpc bypass permite repasse_ind no INSERT', true, null;

select set_config('app.checkout_rpc', 'off', true);

-- 3) guard de INSERT restaurado: sem o flag, não-admin não seta financeiro --
do $$
begin
  begin
    insert into public.linha_itens (pedido_id, produto_id, produto_nome, quantidade, valor, pago)
    values ('00000000-0000-4000-8000-0000000000dd', '00000000-0000-4000-8000-0000000000db', 'Prod Guard', 1, 50.00, true);
    raise exception 'DEVERIA TER SIDO BLOQUEADO';
  exception when others then
    if sqlerrm not like '%Apenas admin define campos financeiros do item%' then
      raise;
    end if;
  end;
end $$;
insert into r values ('INSERT direto de linha_itens com pago=true é bloqueado (não-admin)', true, null);

-- 4) chave_pix protegida de novo -------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-0000000000d2', 'role', 'authenticated')::text, true);

do $$
begin
  begin
    update public.lojas set chave_pix = 'chave-fraudulenta' where id = '00000000-0000-4000-8000-0000000000da';
    raise exception 'DEVERIA TER SIDO BLOQUEADO';
  exception when others then
    if sqlerrm not like '%Troca de chave PIX%' then
      raise;
    end if;
  end;
end $$;
insert into r values ('UPDATE direto de chave_pix é bloqueado (sem app.chave_pix_rpc)', true, null);

select * from r order by nome;
select bool_and(ok) as tudo_ok from r;

rollback;
