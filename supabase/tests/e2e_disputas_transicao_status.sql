-- 0110: confirma que guard_campos_restritos() passa a validar transição de
-- status de disputas por papel. begin/rollback, não altera nada de verdade.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000e01', 'e2e-disputa-comprador@test.local'),
  ('00000000-0000-4000-8000-000000000e02', 'e2e-disputa-seller@test.local');

insert into public.lojas (id, owner_id, nome, cep, rua, numero, cidade, estado)
values ('00000000-0000-4000-8000-000000000e0a', '00000000-0000-4000-8000-000000000e02',
        'Loja E2E Disputa', '69000000', 'Rua A', '1', 'Manaus', 'AM');
update public.lojas set situacao = 'Ativa' where id = '00000000-0000-4000-8000-000000000e0a';

insert into public.produtos (id, loja_id, nome, valor, estoque_atual, status_produto)
values ('00000000-0000-4000-8000-000000000e0b', '00000000-0000-4000-8000-000000000e0a',
        'Produto E2E Disputa', 100.00, 10, 'Aprovado');

insert into public.pedidos (id, id_venda, loja_id, cliente_id, status_pedido, valor_pedido)
values ('00000000-0000-4000-8000-000000000e0c', 'E2EDISPUTA1', '00000000-0000-4000-8000-000000000e0a',
        '00000000-0000-4000-8000-000000000e01', 'Pagamento Realizado', 100.00);

insert into public.linha_itens (pedido_id, produto_id, produto_nome, quantidade, valor)
values ('00000000-0000-4000-8000-000000000e0c', '00000000-0000-4000-8000-000000000e0b',
        'Produto E2E Disputa', 1, 100.00);

insert into public.conversas (id, comprador_id, loja_id, pedido_id)
values ('00000000-0000-4000-8000-000000000e0d', '00000000-0000-4000-8000-000000000e01',
        '00000000-0000-4000-8000-000000000e0a', '00000000-0000-4000-8000-000000000e0c');

-- disputa com SLA já vencido (ontem) e outra com SLA no futuro, pra testar os dois ramos
insert into public.disputas (id, pedido_id, comprador_id, loja_id, conversa_id, motivo, descricao, status, sla_loja_vence_em)
values
  ('00000000-0000-4000-8000-000000000e0e', '00000000-0000-4000-8000-000000000e0c',
   '00000000-0000-4000-8000-000000000e01', '00000000-0000-4000-8000-000000000e0a',
   '00000000-0000-4000-8000-000000000e0d', 'produto_avariado', 'teste', 'aberta', now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000e0f', '00000000-0000-4000-8000-000000000e0c',
   '00000000-0000-4000-8000-000000000e01', '00000000-0000-4000-8000-000000000e0a',
   '00000000-0000-4000-8000-000000000e0d', 'produto_diferente_anunciado', 'teste2', 'aberta', now() + interval '1 day');

create temp table r (nome text, ok boolean, detalhe text);
grant all on r to authenticated;

-- A partir daqui simulamos comprador/loja de verdade: a conexão do CLI usa
-- um role com BYPASSRLS, então precisamos trocar de role explicitamente
-- para exercitar RLS de verdade (o trigger guard_campos_restritos ainda
-- dispararia sem isto, mas as policies puras de SELECT/INSERT não).
set local role authenticated;

-- 1) comprador escala com SLA vencido -> permitido -----------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-000000000e01', 'role', 'authenticated')::text, true);

update public.disputas set status = 'em_mediacao_admin' where id = '00000000-0000-4000-8000-000000000e0e';
insert into r select 'comprador escala com SLA vencido: permitido',
  status = 'em_mediacao_admin', status from public.disputas where id = '00000000-0000-4000-8000-000000000e0e';

-- 2) comprador escala SEM SLA vencido -> bloqueado ------------------------
do $$
declare v_bloqueado boolean := false;
begin
  begin
    update public.disputas set status = 'em_mediacao_admin' where id = '00000000-0000-4000-8000-000000000e0f';
  exception when others then
    v_bloqueado := true;
  end;
  insert into r values ('comprador escala sem SLA vencido: bloqueado', v_bloqueado, v_bloqueado::text);
end $$;

-- 3) loja tenta reverter disputa já em mediação do admin -> bloqueado -----
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-000000000e02', 'role', 'authenticated')::text, true);

do $$
declare v_bloqueado boolean := false;
begin
  begin
    update public.disputas set status = 'em_atendimento_loja' where id = '00000000-0000-4000-8000-000000000e0e';
  exception when others then
    v_bloqueado := true;
  end;
  insert into r values ('loja reverte disputa em mediação do admin: bloqueado', v_bloqueado, v_bloqueado::text);
end $$;

-- 4) loja propõe resolução da OUTRA disputa (ainda aberta) -> permitido ---
-- (0115: loja não fecha mais direto — só propõe; comprador confirma/recusa)
update public.disputas set status = 'aguardando_confirmacao_comprador' where id = '00000000-0000-4000-8000-000000000e0f';
insert into r select 'loja propõe resolução de disputa aberta: permitido',
  status = 'aguardando_confirmacao_comprador', status from public.disputas where id = '00000000-0000-4000-8000-000000000e0f';

-- 4b) loja tenta pular direto para resolvida_pela_loja -> bloqueado (0115) -
do $$
declare v_bloqueado boolean := false;
begin
  begin
    update public.disputas set status = 'resolvida_pela_loja' where id = '00000000-0000-4000-8000-000000000e0f';
  exception when others then
    v_bloqueado := true;
  end;
  insert into r values ('loja fecha disputa direto sem confirmação do comprador: bloqueado', v_bloqueado, v_bloqueado::text);
end $$;

-- 5) loja tenta reverter a que já propôs resolução -> bloqueado -----------
do $$
declare v_bloqueado boolean := false;
begin
  begin
    update public.disputas set status = 'aberta' where id = '00000000-0000-4000-8000-000000000e0f';
  exception when others then
    v_bloqueado := true;
  end;
  insert into r values ('loja reabre disputa com resolução proposta: bloqueado', v_bloqueado, v_bloqueado::text);
end $$;

select nome, ok, detalhe from r order by nome;
select case when bool_and(ok) then 'TODOS PASSARAM' else 'FALHOU' end as resultado from r;

rollback;
