-- QA transacional do PR #14 (migrations 0034-0036). Roda inteiro em uma
-- transação e dá ROLLBACK no final — não deixa rastro no banco.
-- Rodar: npx supabase db query --linked --file supabase/qa/qa_pr14.sql
-- Sucesso = última linha "QA PR14: TODOS OS TESTES PASSARAM".

begin;

do $$
declare
  v_loja uuid;
  v_owner uuid;
  v_ok boolean;
  v_evt int;
begin
  -- 0. objetos existem
  if to_regclass('public.auditoria_eventos') is null then raise exception 'FALHA: auditoria_eventos nao existe'; end if;
  if to_regclass('public.perfis_compradores') is null then raise exception 'FALHA: perfis_compradores nao existe'; end if;
  if not exists (select 1 from pg_proc where proname='alterar_chave_pix_loja') then raise exception 'FALHA: RPC alterar_chave_pix_loja nao existe'; end if;

  -- loja real com dono não-admin
  select l.id, l.owner_id into v_loja, v_owner
  from lojas l
  where l.owner_id is not null
    and not exists (select 1 from admins a where a.user_id = l.owner_id)
  limit 1;
  if v_loja is null then raise exception 'FALHA: nenhuma loja com dono nao-admin para testar'; end if;

  -- simula o seller logado
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  -- 1. guard: UPDATE direto de chave_pix deve falhar
  begin
    update lojas set chave_pix = 'hack@evil.com', tipo_chave_pix = 'EMAIL' where id = v_loja;
    raise exception 'FALHA: guard nao bloqueou UPDATE direto de chave_pix';
  exception when others then
    if sqlerrm not like '%alterar_chave_pix_loja%' then raise; end if;
  end;
  raise notice 'OK 1: guard bloqueia UPDATE direto de chave_pix';

  -- 2. RPC: CPF com tamanho errado deve falhar
  begin
    perform alterar_chave_pix_loja(v_loja, '123', 'CPF');
    raise exception 'FALHA: RPC aceitou CPF invalido';
  exception when others then
    if sqlerrm not like '%CPF inv%' then raise; end if;
  end;
  raise notice 'OK 2: RPC rejeita CPF invalido';

  -- 3. RPC: troca válida atualiza, zera confirmação e audita
  perform alterar_chave_pix_loja(v_loja, 'qa-pr14@teste.com', 'EMAIL');
  select (chave_pix = 'qa-pr14@teste.com' and chave_pix_confirmada_em is null)
    into v_ok from lojas where id = v_loja;
  if not v_ok then raise exception 'FALHA: RPC nao atualizou chave/carencia'; end if;
  -- a RLS de auditoria_eventos é admin-only (correto): lê como postgres
  perform set_config('role', 'postgres', true);
  select count(*) into v_evt from auditoria_eventos
    where acao = 'chave_pix.alterada' and registro_id = v_loja and ator_id = v_owner;
  perform set_config('role', 'authenticated', true);
  if v_evt < 1 then raise exception 'FALHA: troca de chave sem evento de auditoria'; end if;
  if chave_pix_elegivel_repasse(v_loja) then raise exception 'FALHA: chave recem-trocada elegivel a repasse'; end if;
  raise notice 'OK 3: troca valida + carencia + auditoria';

  -- 4. seller não confirma a própria chave
  begin
    perform confirmar_chave_pix(v_loja);
    raise exception 'FALHA: seller confirmou a propria chave PIX';
  exception when others then
    if sqlerrm not like '%admin ou service_role%' then raise; end if;
  end;
  raise notice 'OK 4: confirmar_chave_pix exige admin/service_role';

  -- 5. gate B2B: venda futura sem perfil PJ deve falhar
  begin
    perform checkout_criar_pedido(
      jsonb_build_array(jsonb_build_object(
        'produto_id', gen_random_uuid(), 'quantidade', 1,
        'venda_futura_id', gen_random_uuid())),
      jsonb_build_object('tipo','retirada'), 'PIX');
    raise exception 'FALHA: checkout aceitou venda futura sem CNPJ/IE';
  exception when others then
    if sqlerrm not like '%CNPJ ou Inscri%' then raise; end if;
  end;
  raise notice 'OK 5: gate CNPJ/IE bloqueia venda futura sem perfil';

  -- 6. salvar perfil PJ e passar do gate (falha depois por produto inexistente)
  perform salvar_perfil_comprador_pj('CNPJ', '12.345.678/0001-95', false, 'QA LTDA');
  begin
    perform checkout_criar_pedido(
      jsonb_build_array(jsonb_build_object(
        'produto_id', gen_random_uuid(), 'quantidade', 1,
        'venda_futura_id', gen_random_uuid())),
      jsonb_build_object('tipo','retirada'), 'PIX');
    raise exception 'FALHA: produto fantasma passou';
  exception when others then
    if sqlerrm like '%CNPJ ou Inscri%' then
      raise exception 'FALHA: gate ainda bloqueia com perfil PJ salvo';
    elsif sqlerrm not like '%Produto indispon%' then raise; end if;
  end;
  raise notice 'OK 6: com perfil PJ o gate libera (erro seguinte = produto inexistente, esperado)';

  -- 7. trigger de auditoria em situacao da loja (como service_role/admin)
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
  update lojas set situacao = situacao where id = v_loja; -- sem mudança: não audita
  update lojas set situacao = case when situacao = 'Ativa' then 'Inativa' else 'Ativa' end where id = v_loja;
  select count(*) into v_evt from auditoria_eventos
    where acao = 'loja.situacao_alterada' and registro_id = v_loja;
  if v_evt < 1 then raise exception 'FALHA: mudanca de situacao sem auditoria'; end if;
  raise notice 'OK 7: trigger audita mudanca de situacao';

  raise notice 'QA PR14: TODOS OS TESTES PASSARAM';
end $$;

rollback;
