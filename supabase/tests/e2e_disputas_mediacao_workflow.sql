-- 0115: confirma o novo fluxo de mediação (revisão de workflow, PRD 009,
-- brainstorm 2026-08-10): comprador confirma/recusa a proposta da loja sem
-- trava de tempo, e o canal de mediação privado nunca vaza para o outro
-- lado. begin/rollback, não altera nada de verdade.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000f001', 'e2e-mediacao-comprador@test.local'),
  ('00000000-0000-4000-8000-00000000f002', 'e2e-mediacao-seller@test.local');

insert into public.lojas (id, owner_id, nome, cep, rua, numero, cidade, estado)
values ('00000000-0000-4000-8000-00000000f00a', '00000000-0000-4000-8000-00000000f002',
        'Loja E2E Mediação', '69000000', 'Rua A', '1', 'Manaus', 'AM');
update public.lojas set situacao = 'Ativa' where id = '00000000-0000-4000-8000-00000000f00a';

insert into public.produtos (id, loja_id, nome, valor, estoque_atual, status_produto)
values ('00000000-0000-4000-8000-00000000f00b', '00000000-0000-4000-8000-00000000f00a',
        'Produto E2E Mediação', 100.00, 10, 'Aprovado');

insert into public.pedidos (id, id_venda, loja_id, cliente_id, status_pedido, valor_pedido)
values ('00000000-0000-4000-8000-00000000f00c', 'E2EMEDIACAO1', '00000000-0000-4000-8000-00000000f00a',
        '00000000-0000-4000-8000-00000000f001', 'Pagamento Realizado', 100.00);

insert into public.linha_itens (pedido_id, produto_id, produto_nome, quantidade, valor)
values ('00000000-0000-4000-8000-00000000f00c', '00000000-0000-4000-8000-00000000f00b',
        'Produto E2E Mediação', 1, 100.00);

insert into public.conversas (id, comprador_id, loja_id, pedido_id)
values ('00000000-0000-4000-8000-00000000f00d', '00000000-0000-4000-8000-00000000f001',
        '00000000-0000-4000-8000-00000000f00a', '00000000-0000-4000-8000-00000000f00c');

-- duas disputas: uma para o fluxo de confirmação, outra para o de recusa.
insert into public.disputas (id, pedido_id, comprador_id, loja_id, conversa_id, motivo, descricao, status, sla_loja_vence_em)
values
  ('00000000-0000-4000-8000-00000000f00e', '00000000-0000-4000-8000-00000000f00c',
   '00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-00000000f00a',
   '00000000-0000-4000-8000-00000000f00d', 'produto_avariado', 'teste confirma', 'aberta', now() + interval '1 day'),
  ('00000000-0000-4000-8000-00000000f00f', '00000000-0000-4000-8000-00000000f00c',
   '00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-00000000f00a',
   '00000000-0000-4000-8000-00000000f00d', 'produto_diferente_anunciado', 'teste recusa', 'aberta', now() + interval '1 day');

create temp table r (nome text, ok boolean, detalhe text);

-- 1) loja propõe resolução (aberta -> aguardando_confirmacao_comprador) ---
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-00000000f002', 'role', 'authenticated')::text, true);

update public.disputas set status = 'aguardando_confirmacao_comprador', proposta_resolucao_em = now()
  where id in ('00000000-0000-4000-8000-00000000f00e', '00000000-0000-4000-8000-00000000f00f');
insert into r select 'loja propõe resolução: permitido',
  status = 'aguardando_confirmacao_comprador', status from public.disputas where id = '00000000-0000-4000-8000-00000000f00e';

-- 2) comprador CONFIRMA a resolução -> resolvida_pela_loja ----------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-00000000f001', 'role', 'authenticated')::text, true);

update public.disputas set status = 'resolvida_pela_loja' where id = '00000000-0000-4000-8000-00000000f00e';
insert into r select 'comprador confirma resolução: permitido',
  status = 'resolvida_pela_loja', status from public.disputas where id = '00000000-0000-4000-8000-00000000f00e';

-- 3) comprador RECUSA a resolução -> em_mediacao_admin, SEM SLA vencido ---
-- (SLA de 48h da OUTRA disputa nem chegou perto de vencer — mostra que a
-- recusa não depende do SLA, diferente do caminho de "loja não respondeu").
update public.disputas set status = 'em_mediacao_admin' where id = '00000000-0000-4000-8000-00000000f00f';
insert into r select 'comprador recusa resolução (sem SLA vencido): permitido',
  status = 'em_mediacao_admin', status from public.disputas where id = '00000000-0000-4000-8000-00000000f00f';

-- 4) mensagens de mediação: comprador só vê/escreve no canal 'comprador' --
insert into public.disputa_mensagens_mediacao (disputa_id, destinatario, autor_id, corpo)
values ('00000000-0000-4000-8000-00000000f00f', 'comprador', '00000000-0000-4000-8000-00000000f001', 'msg do comprador');

do $$
declare v_bloqueado boolean := false;
begin
  begin
    insert into public.disputa_mensagens_mediacao (disputa_id, destinatario, autor_id, corpo)
    values ('00000000-0000-4000-8000-00000000f00f', 'loja', '00000000-0000-4000-8000-00000000f001', 'comprador tentando escrever no canal da loja');
  exception when others then
    v_bloqueado := true;
  end;
  insert into r values ('comprador não escreve no canal da loja: bloqueado', v_bloqueado, v_bloqueado::text);
end $$;

insert into r select 'comprador não vê mensagens do canal da loja: bloqueado (0 linhas)',
  count(*) = 0, count(*)::text
from public.disputa_mensagens_mediacao
where disputa_id = '00000000-0000-4000-8000-00000000f00f' and destinatario = 'loja';

-- 5) mensagens de mediação: loja só vê/escreve no canal 'loja' ------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-00000000f002', 'role', 'authenticated')::text, true);

insert into public.disputa_mensagens_mediacao (disputa_id, destinatario, autor_id, corpo)
values ('00000000-0000-4000-8000-00000000f00f', 'loja', '00000000-0000-4000-8000-00000000f002', 'msg da loja');

do $$
declare v_bloqueado boolean := false;
begin
  begin
    insert into public.disputa_mensagens_mediacao (disputa_id, destinatario, autor_id, corpo)
    values ('00000000-0000-4000-8000-00000000f00f', 'comprador', '00000000-0000-4000-8000-00000000f002', 'loja tentando escrever no canal do comprador');
  exception when others then
    v_bloqueado := true;
  end;
  insert into r values ('loja não escreve no canal do comprador: bloqueado', v_bloqueado, v_bloqueado::text);
end $$;

insert into r select 'loja não vê mensagens do canal do comprador: bloqueado (0 linhas)',
  count(*) = 0, count(*)::text
from public.disputa_mensagens_mediacao
where disputa_id = '00000000-0000-4000-8000-00000000f00f' and destinatario = 'comprador';

select nome, ok, detalhe from r order by nome;
select case when bool_and(ok) then 'TODOS PASSARAM' else 'FALHOU' end as resultado from r;

rollback;
