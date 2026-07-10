-- 0032: defesa em profundidade na pedido_cancelar_devolver_estoque (0024).
-- A função era protegida SÓ por REVOKE/GRANT — um `grant execute to
-- authenticated` acidental em migration futura reabriria cancelamento de
-- pedido de terceiro para qualquer usuário logado. Agora o corpo valida o
-- papel do CHAMADOR via request.jwt.claims (GUC de sessão do PostgREST, que
-- sobrevive dentro de SECURITY DEFINER — current_user aqui seria sempre o
-- owner e não serve). Chamadas sem claims (conexão direta postgres/psql,
-- ex.: manutenção via CLI) continuam permitidas; chamadas PostgREST só com
-- JWT de service_role (o único chamador legítimo é o webhook Asaas).

create or replace function public.pedido_cancelar_devolver_estoque(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jwt_role text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
begin
  if v_jwt_role is not null and v_jwt_role <> 'service_role' then
    raise exception 'pedido_cancelar_devolver_estoque: apenas service_role';
  end if;

  -- idempotente: só mexe em pedido ainda não pago e ainda não cancelado
  if not exists (
    select 1 from pedidos
    where id = p_pedido_id and status_pedido = 'Aguardando Pagamento'
  ) then
    return;
  end if;

  update produtos p set estoque_atual = p.estoque_atual + li.quantidade
  from linha_itens li
  where li.pedido_id = p_pedido_id and li.produto_id = p.id;

  update pedidos set status_pedido = 'Cancelado' where id = p_pedido_id;
end;
$$;

revoke all on function public.pedido_cancelar_devolver_estoque(uuid) from public;
grant execute on function public.pedido_cancelar_devolver_estoque(uuid) to service_role;
