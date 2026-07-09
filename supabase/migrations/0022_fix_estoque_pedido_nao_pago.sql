-- 0022: pedido nunca pago prendia o estoque pra sempre — checkout_criar_pedido
-- decrementa estoque_atual na criação ('Aguardando Pagamento') e não havia
-- nenhum caminho (webhook de cancelamento/estorno) que devolvesse. Qualquer
-- usuário logado podia zerar o estoque de um concorrente com checkouts
-- 'retirada' nunca pagos. RPC de service role devolve estoque e cancela o
-- pedido quando o Asaas reporta PAYMENT_OVERDUE/DELETED/CANCELED/REFUNDED.

create or replace function public.pedido_cancelar_devolver_estoque(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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
