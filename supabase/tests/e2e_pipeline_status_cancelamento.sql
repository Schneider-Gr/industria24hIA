-- E2E do pipeline pós-pagamento + cancelamento (0107) em begin/rollback.
-- Verifica: transição válida (Pagamento Realizado -> Em Separação -> Enviado),
-- transição inválida (pular etapa) rejeitada, e cancelamento repondo estoque.
-- Seeds direto nas tabelas (não via checkout_criar_pedido) para não acoplar
-- este teste à evolução da assinatura do RPC de checkout.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000301', 'e2e-pipe-seller@test.local'),
  ('00000000-0000-4000-8000-000000000302', 'e2e-pipe-outro-seller@test.local');

insert into public.lojas (id, owner_id, nome, cep, rua, numero, cidade, estado)
values ('00000000-0000-4000-8000-0000000003aa', '00000000-0000-4000-8000-000000000301',
        'Loja E2E Pipeline', '69000000', 'Rua A', '1', 'Manaus', 'AM');
update public.lojas set situacao = 'Ativa' where id = '00000000-0000-4000-8000-0000000003aa';

insert into public.produtos (id, loja_id, nome, valor, estoque_atual, status_produto)
values ('00000000-0000-4000-8000-0000000003b1', '00000000-0000-4000-8000-0000000003aa',
        'Produto E2E Pipeline', 100.00, 10, 'Aprovado');

insert into public.pedidos (id, id_venda, loja_id, status_pedido, valor_pedido)
values ('00000000-0000-4000-8000-0000000003c1', 'E2EPIPE001', '00000000-0000-4000-8000-0000000003aa',
        'Pagamento Realizado', 300.00);

insert into public.linha_itens (pedido_id, produto_id, produto_nome, quantidade, valor)
values ('00000000-0000-4000-8000-0000000003c1', '00000000-0000-4000-8000-0000000003b1',
        'Produto E2E Pipeline', 3, 300.00);

-- estoque cai para 7 (10 - 3), como o checkout faria no insert real
update public.produtos set estoque_atual = 7 where id = '00000000-0000-4000-8000-0000000003b1';

create temp table r (nome text, ok boolean, detalhe text);

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-000000000301', 'role', 'authenticated')::text, true);

-- 1) outro seller (não dono) tenta avançar -> bloqueado --------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-000000000302', 'role', 'authenticated')::text, true);

do $$
declare v_bloqueado boolean := false;
begin
  begin
    perform public.pedido_avancar_status('00000000-0000-4000-8000-0000000003c1', 'Em Separação');
  exception when others then
    v_bloqueado := true;
  end;
  insert into r values ('seller de outra loja: bloqueado', v_bloqueado, v_bloqueado::text);
end $$;

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-000000000301', 'role', 'authenticated')::text, true);

-- 2) transição pulando etapa (Pagamento Realizado -> Enviado) -> rejeitada -
do $$
declare v_rejeitado boolean := false;
begin
  begin
    perform public.pedido_avancar_status('00000000-0000-4000-8000-0000000003c1', 'Enviado');
  exception when others then
    v_rejeitado := true;
  end;
  insert into r values ('pular etapa (Pagamento Realizado -> Enviado): rejeitada', v_rejeitado, v_rejeitado::text);
end $$;

-- 3) transição válida Pagamento Realizado -> Em Separação -----------------
select public.pedido_avancar_status('00000000-0000-4000-8000-0000000003c1', 'Em Separação');

insert into r
select 'após avançar: status = Em Separação',
       status_pedido = 'Em Separação', status_pedido
from public.pedidos where id = '00000000-0000-4000-8000-0000000003c1';

-- 4) transição válida Em Separação -> Enviado ------------------------------
select public.pedido_avancar_status('00000000-0000-4000-8000-0000000003c1', 'Enviado');

insert into r
select 'após avançar de novo: status = Enviado',
       status_pedido = 'Enviado', status_pedido
from public.pedidos where id = '00000000-0000-4000-8000-0000000003c1';

-- 5) cancelar pedido Enviado -> rejeitado ----------------------------------
do $$
declare v_rejeitado boolean := false;
begin
  begin
    perform public.pedido_cancelar('00000000-0000-4000-8000-0000000003c1', 'teste pós-envio');
  exception when others then
    v_rejeitado := true;
  end;
  insert into r values ('cancelar pedido Enviado: rejeitado', v_rejeitado, v_rejeitado::text);
end $$;

-- 6) segundo pedido, ainda Pagamento Realizado, para testar cancelamento --
insert into public.pedidos (id, id_venda, loja_id, status_pedido, valor_pedido)
values ('00000000-0000-4000-8000-0000000003c2', 'E2EPIPE002', '00000000-0000-4000-8000-0000000003aa',
        'Pagamento Realizado', 200.00);

insert into public.linha_itens (pedido_id, produto_id, produto_nome, quantidade, valor)
values ('00000000-0000-4000-8000-0000000003c2', '00000000-0000-4000-8000-0000000003b1',
        'Produto E2E Pipeline', 2, 200.00);

select public.pedido_cancelar('00000000-0000-4000-8000-0000000003c2', 'teste de cancelamento');

insert into r
select 'após cancelar: status = Cancelado',
       status_pedido = 'Cancelado', status_pedido
from public.pedidos where id = '00000000-0000-4000-8000-0000000003c2';

insert into r
select 'após cancelar: estoque reposto (7 + 2 = 9)',
       estoque_atual = 9, estoque_atual::text
from public.produtos where id = '00000000-0000-4000-8000-0000000003b1';

-- resultado ------------------------------------------------------------
select nome, ok, detalhe from r order by nome;
select case when bool_and(ok) then 'TODOS PASSARAM' else 'FALHOU' end as resultado from r;

rollback;
