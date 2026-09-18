-- Teste da 0191: rode com `supabase db query --linked --file`. Tudo em transacao, rollback no fim.
begin;
do $$
declare v_ped uuid; v_prod uuid; v_a numeric; v_b numeric;
begin
  select li.pedido_id, li.produto_id into v_ped, v_prod
    from public.linha_itens li join public.produtos p on p.id = li.produto_id limit 1;
  if v_ped is null then raise exception 'TESTE INVALIDO: sem linha_itens'; end if;

  -- CASO A: nenhum item entregue -> devolve
  update public.linha_itens set entregue = false where pedido_id = v_ped;
  delete from public.entregas where linha_item_id in (select id from public.linha_itens where pedido_id = v_ped);
  insert into public.estoque_reservas (pedido_id, produto_id, quantidade, status, expira_em)
    values (v_ped, v_prod, 7, 'ativa', now() + interval '1 day');
  select estoque_atual into v_a from public.produtos where id = v_prod;
  perform public.pedido_restaurar_estoque(v_ped);
  select estoque_atual into v_b from public.produtos where id = v_prod;
  if v_b - v_a <> 7 then raise exception 'FALHOU A: esperava +7, veio % -> %', v_a, v_b; end if;

  -- CASO B: item entregue -> NAO devolve
  update public.linha_itens set entregue = true where pedido_id = v_ped;
  insert into public.estoque_reservas (pedido_id, produto_id, quantidade, status, expira_em)
    values (v_ped, v_prod, 7, 'ativa', now() + interval '1 day');
  select estoque_atual into v_a from public.produtos where id = v_prod;
  perform public.pedido_restaurar_estoque(v_ped);
  select estoque_atual into v_b from public.produtos where id = v_prod;
  if v_a is distinct from v_b then raise exception 'FALHOU B: estoque voltou em pedido entregue % -> %', v_a, v_b; end if;

  -- CASO C: pedido_cancelar recusa pedido entregue
  begin
    perform public.pedido_cancelar(v_ped, 'teste');
    raise exception 'FALHOU C: cancelou pedido entregue';
  exception when others then
    if sqlerrm not like '%já entregue%' and sqlerrm not like '%permissão%' then raise; end if;
    raise notice 'OK C: %', sqlerrm;
  end;
  raise notice 'OK A, B e C';
end $$;
rollback;
