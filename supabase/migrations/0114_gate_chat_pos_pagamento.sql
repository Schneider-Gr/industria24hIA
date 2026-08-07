-- 0114: chat comprador↔vendedor só abre nova conversa depois de pedido pago
-- (produto_id, se veio; senão qualquer pedido pago daquela loja). Conversas
-- já existentes continuam acessíveis normalmente — o gate roda só em
-- iniciarConversa, não em enviarMensagem/RLS de mensagens.
--
-- SECURITY DEFINER como pedido_confirmar_entrega (0071): evita fazer o join
-- pedidos×linha_itens no client via duas views sem relação PostgREST
-- configurada; roda como owner e filtra por auth.uid() internamente.

create or replace function public.comprador_tem_pedido_pago(
  p_loja_id uuid,
  p_produto_id uuid default null
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pedidos pe
    join public.linha_itens li on li.pedido_id = pe.id
    where pe.cliente_id = auth.uid()
      and pe.loja_id = p_loja_id
      and pe.status_pedido = 'Pagamento Realizado'
      and (p_produto_id is null or li.produto_id = p_produto_id)
  );
$$;

revoke all on function public.comprador_tem_pedido_pago(uuid, uuid) from public;
grant execute on function public.comprador_tem_pedido_pago(uuid, uuid) to authenticated;
