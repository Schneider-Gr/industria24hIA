-- WhatsApp de contato do pedido (para o disparo do código de retirada e
-- avisos de pagamento). O checkout captura o número; a coluna é gravada por
-- RPC security definer (service role fica desligado no fluxo do checkout).

alter table public.pedidos
  add column if not exists telefone_contato text;

create or replace function public.pedido_registrar_contato(
  p_pedido_id uuid,
  p_telefone text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_digits text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
begin
  if v_user is null then
    raise exception 'Faça login.';
  end if;
  if length(v_digits) < 10 or length(v_digits) > 13 then
    raise exception 'Telefone inválido.';
  end if;

  update pedidos
  set telefone_contato = v_digits
  where id = p_pedido_id and cliente_id = v_user;
  if not found then
    raise exception 'Pedido não encontrado.';
  end if;
end;
$$;

revoke all on function public.pedido_registrar_contato(uuid, text) from public;
grant execute on function public.pedido_registrar_contato(uuid, text) to authenticated;
