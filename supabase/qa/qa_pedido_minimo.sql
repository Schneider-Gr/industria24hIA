-- QA transacional do valor_pedido_minimo (0028 + PR #234). Roda inteiro em
-- uma transação e dá ROLLBACK no final — não deixa rastro no banco.
-- Rodar: supabase db query --linked --file supabase/qa/qa_pedido_minimo.sql
-- Sucesso = última linha "QA PEDIDO MINIMO: TODOS OS TESTES PASSARAM".

begin;

do $$
declare
  v_loja uuid;
  v_produto uuid;
  v_comprador uuid;
  v_valor numeric(12,2);
  v_minimo_alto numeric(12,2);
  v_erro text;
begin
  -- produto real, aprovado, com estoque, de uma loja ativa
  select p.id, p.loja_id, p.valor into v_produto, v_loja, v_valor
  from produtos p
  join lojas l on l.id = p.loja_id
  where p.status_produto = 'Aprovado' and p.valor > 0 and p.estoque_atual >= 1
    and (p.quantidade_minima is null or p.quantidade_minima <= 1)
    and l.situacao = 'Ativa' and l.permite_retirada_na_loja
  limit 1;
  if v_loja is null then raise exception 'FALHA: nenhum produto/loja elegível pra teste'; end if;

  -- qualquer comprador existente serve (não precisa ser o dono da loja)
  select id into v_comprador from auth.users where id <> (select owner_id from lojas where id = v_loja) limit 1;
  if v_comprador is null then raise exception 'FALHA: nenhum comprador disponível pra teste'; end if;

  -- mínimo bem acima do valor do item, pra garantir que o pedido fica abaixo
  v_minimo_alto := v_valor * 1000 + 1000;
  update lojas set valor_pedido_minimo = v_minimo_alto where id = v_loja;

  -- simula o comprador logado
  perform set_config('request.jwt.claims', json_build_object('sub', v_comprador, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  -- 1. pedido abaixo do mínimo deve ser rejeitado com a mensagem certa
  v_erro := null;
  begin
    perform checkout_criar_pedido(
      jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'quantidade', 1)),
      jsonb_build_object('tipo', 'retirada'),
      'PIX'
    );
    raise exception 'FALHA: RPC aceitou pedido abaixo do minimo';
  exception when others then
    v_erro := sqlerrm;
  end;
  if v_erro not like '%abaixo do valor mínimo%' then
    raise exception 'FALHA: erro inesperado (esperava "abaixo do valor mínimo"): %', v_erro;
  end if;
  raise notice 'OK 1: checkout rejeita pedido abaixo do minimo (%)', v_erro;

  -- 2. sem mínimo (null), o mesmo carrinho passa da checagem de mínimo
  --    (pode ainda falhar depois por outro motivo — CEP/estoque/etc — o que
  --    importa aqui é NÃO ser mais o erro de "abaixo do valor mínimo")
  perform set_config('role', 'postgres', true);
  update lojas set valor_pedido_minimo = null where id = v_loja;
  perform set_config('role', 'authenticated', true);

  v_erro := null;
  begin
    perform checkout_criar_pedido(
      jsonb_build_array(jsonb_build_object('produto_id', v_produto, 'quantidade', 1)),
      jsonb_build_object('tipo', 'retirada'),
      'PIX'
    );
  exception when others then
    v_erro := sqlerrm;
  end;
  if v_erro like '%abaixo do valor mínimo%' then
    raise exception 'FALHA: bloqueou por minimo mesmo com valor_pedido_minimo = null';
  end if;
  raise notice 'OK 2: sem minimo definido, checagem de minimo nao bloqueia (erro seguinte, se houver: %)', coalesce(v_erro, '(nenhum — pedido criado)');

  raise notice 'QA PEDIDO MINIMO: TODOS OS TESTES PASSARAM';
end $$;

rollback;
