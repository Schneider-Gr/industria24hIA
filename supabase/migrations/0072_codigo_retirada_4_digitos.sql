-- Código de retirada/entrega passa de 6 para 4 dígitos (decisão do dono,
-- 23/07). Seguro porque a RPC pedido_confirmar_entrega só é executável pelo
-- dono da loja do pedido — não há superfície de força bruta; o código é
-- confirmação operacional (padrão iFood/99).

create or replace function public.gerar_codigo_retirada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status_pedido = 'Pagamento Realizado' and new.codigo_retirada is null then
    new.codigo_retirada := lpad(floor(random() * 10000)::int::text, 4, '0');
  end if;
  return new;
end;
$$;

-- Regrava os códigos já emitidos (fluxo acabou de entrar; nenhum foi usado).
update public.pedidos
set codigo_retirada = lpad(floor(random() * 10000)::int::text, 4, '0')
where codigo_retirada is not null;
