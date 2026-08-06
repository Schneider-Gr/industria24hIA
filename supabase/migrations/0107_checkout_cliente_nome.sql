-- 0107: pedidos.cliente_nome nunca era preenchido pelo checkout (a coluna
-- existe e é lida em vários painéis admin/seller, mas ficava sempre null).
-- O checkout front-end já captura `nome` do formulário (checkout/actions.ts)
-- mas nunca o repassava até o banco.
--
-- Não dá para adicionar um parâmetro à função base de 3 args
-- (checkout_criar_pedido(jsonb, jsonb, text)) nem às de 4/5 args (ref,
-- frete_consolidado): qualquer novo parâmetro colidiria em tipo com um
-- overload já existente. Em vez disso, cria um overload de 6 args que
-- delega para o de 5 (mantendo toda a lógica validada) e só grava
-- cliente_nome com um UPDATE pontual depois, seguindo o mesmo padrão do
-- overload de 4 args (0065) que atualiza linha_itens após delegar.

create or replace function public.checkout_criar_pedido(
  itens jsonb,
  entrega jsonb,
  forma_pagamento text,
  ref text,
  frete_consolidado boolean,
  cliente_nome text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido uuid;
  v_nome text := nullif(trim(cliente_nome), '');
begin
  v_pedido := public.checkout_criar_pedido(itens, entrega, forma_pagamento, ref, frete_consolidado);

  if v_nome is not null then
    update pedidos set cliente_nome = v_nome where id = v_pedido;
  end if;

  return v_pedido;
end;
$$;

revoke all on function public.checkout_criar_pedido(jsonb, jsonb, text, text, boolean, text) from public;
grant execute on function public.checkout_criar_pedido(jsonb, jsonb, text, text, boolean, text) to authenticated;
