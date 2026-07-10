-- Smoke test de RLS/segurança (auditoria RLS 2026-07-09, achado 4).
-- Roda inteiro em transação com ROLLBACK — não altera nada.
--
--   supabase db query --linked --file supabase/tests/rls_smoke.sql
--
-- Falha (raise exception) se qualquer invariante de segurança quebrar.
-- Objetos que ainda não existem no banco alvo (migrations não aplicadas)
-- são pulados com NOTICE, para o teste servir tanto em prod quanto staging.

begin;

do $$
declare
  r record;
  v_def text;
  v_cols text;
begin
  ---------------------------------------------------------------------------
  -- 1. Toda tabela em public tem RLS habilitada
  ---------------------------------------------------------------------------
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  loop
    raise exception 'RLS DESABILITADA na tabela public.%', r.relname;
  end loop;

  ---------------------------------------------------------------------------
  -- 2. Views que rodam como owner (security_invoker off) DEVEM manter o
  --    filtro auth.uid() na definição — é a única barreira delas
  --    (auditoria RLS achado 1: um CREATE OR REPLACE sem o filtro vaza a
  --    tabela base inteira). lojas_vitrine é pública por design, sem filtro.
  ---------------------------------------------------------------------------
  for r in
    select v from unnest(array[
      'afiliado_ganhos', 'pedidos_cliente', 'linha_itens_cliente',
      'logistica_pedidos', 'logistica_itens'
    ]) as v
  loop
    if to_regclass('public.' || r.v) is null then
      raise notice 'view % ausente (migration nao aplicada) — pulando', r.v;
      continue;
    end if;
    v_def := pg_get_viewdef(('public.' || r.v)::regclass);
    -- logistica_* filtram via eh_afiliado_logistica(), que usa auth.uid() dentro
    if v_def not ilike '%auth.uid()%' and v_def not ilike '%eh_afiliado_logistica%' then
      raise exception 'VIEW public.% perdeu o filtro auth.uid() — vaza a tabela base', r.v;
    end if;
  end loop;

  ---------------------------------------------------------------------------
  -- 3. Views de exposição limitada não podem ganhar colunas sensíveis
  ---------------------------------------------------------------------------
  if to_regclass('public.lojas_vitrine') is not null then
    select string_agg(column_name, ',') into v_cols
    from information_schema.columns
    where table_schema = 'public' and table_name = 'lojas_vitrine'
      and column_name in ('pix','cnpj','email','whatsapp_pessoal','endereco','asaas_wallet_id');
    if v_cols is not null then
      raise exception 'lojas_vitrine expoe colunas sensiveis: %', v_cols;
    end if;
  end if;

  if to_regclass('public.afiliado_ganhos') is not null then
    select string_agg(column_name, ',') into v_cols
    from information_schema.columns
    where table_schema = 'public' and table_name = 'afiliado_ganhos'
      and (column_name ilike '%endereco%' or column_name ilike '%cep%'
           or column_name ilike 'asaas%'
           -- repasse_afiliado é o ganho do PRÓPRIO afiliado; os demais repasses não
           or (column_name ilike '%repasse%' and column_name <> 'repasse_afiliado'));
    if v_cols is not null then
      raise exception 'afiliado_ganhos expoe colunas sensiveis: %', v_cols;
    end if;
  end if;

  ---------------------------------------------------------------------------
  -- 4. Usuário autenticado aleatório não lê pedidos/linha_itens de terceiros
  ---------------------------------------------------------------------------
  perform set_config('request.jwt.claims',
    '{"role":"authenticated","sub":"00000000-0000-0000-0000-0000000000ff"}', true);
  perform set_config('role', 'authenticated', true);

  if exists (select 1 from pedidos limit 1) then
    raise exception 'authenticated sem vinculo le linhas de pedidos';
  end if;
  if exists (select 1 from linha_itens limit 1) then
    raise exception 'authenticated sem vinculo le linhas de linha_itens';
  end if;
  if exists (select 1 from afiliacoes limit 1) then
    raise exception 'authenticated sem vinculo le linhas de afiliacoes';
  end if;

  ---------------------------------------------------------------------------
  -- 5. RPC de cancelamento rejeita JWT que não seja service_role
  --    (mesmo que um GRANT acidental a torne executável — defesa da 0032)
  ---------------------------------------------------------------------------
  perform set_config('role', 'postgres', true); -- volta pra checar/chamar
  if to_regprocedure('public.pedido_cancelar_devolver_estoque(uuid)') is not null then
    begin
      perform public.pedido_cancelar_devolver_estoque('00000000-0000-0000-0000-000000000001');
      raise exception 'pedido_cancelar_devolver_estoque ACEITOU jwt authenticated';
    exception
      when raise_exception then
        if sqlerrm like '%ACEITOU%' then raise; end if;
        raise notice 'guarda da RPC ok (bloqueou authenticated)';
    end;
  else
    raise notice 'pedido_cancelar_devolver_estoque ausente — pulando';
  end if;

  raise notice 'RLS SMOKE: todos os checks passaram';
end $$;

select 'rls_smoke_ok' as resultado;

rollback;
