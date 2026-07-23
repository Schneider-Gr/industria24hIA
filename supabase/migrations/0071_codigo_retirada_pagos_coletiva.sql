-- Código de retirada/entrega por pedido + transparência de pagamento da
-- compra coletiva (continuação do PRD MPDD-36; PRs #80/#82).
--
-- 1) `pedidos.codigo_retirada`: código de 6 dígitos gerado quando o pedido
--    é PAGO. O comprador apresenta na retirada (ou ao entregador); o seller
--    confirma via RPC, que marca as linhas do pedido como Entregue na
--    tabela `entregas` (fonte única de fulfillment, 0009/0014).
-- 2) View pública `coletiva_pagamentos`: agregado "X de Y pedidos pagos"
--    por coletiva — sem expor quem pagou.

-- ============ 1. Código de retirada ============
alter table public.pedidos
  add column if not exists codigo_retirada text;

create or replace function public.gerar_codigo_retirada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status_pedido = 'Pagamento Realizado' and new.codigo_retirada is null then
    new.codigo_retirada := lpad(floor(random() * 1000000)::int::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gerar_codigo_retirada on public.pedidos;
create trigger trg_gerar_codigo_retirada
  before insert or update of status_pedido on public.pedidos
  for each row execute function public.gerar_codigo_retirada();

-- Backfill dos pedidos já pagos.
update public.pedidos
set codigo_retirada = lpad(floor(random() * 1000000)::int::text, 6, '0')
where status_pedido = 'Pagamento Realizado' and codigo_retirada is null;

-- Comprador vê o próprio código (view de consumo, 0027).
create or replace view public.pedidos_cliente as
  select id, id_venda, data, status_pedido, valor_pedido, forma_pagamento,
         link_cobranca, asaas_cobranca_id, codigo_retirada
  from public.pedidos
  where cliente_id = auth.uid();

-- ============ 2. Confirmar retirada/entrega pelo código ============
-- Dono da loja digita o código apresentado pelo comprador; todas as linhas
-- do pedido viram Entregue em `entregas`.
create or replace function public.pedido_confirmar_entrega(
  p_pedido_id uuid,
  p_codigo text
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_ped record;
  v_n int;
begin
  if v_user is null then
    raise exception 'Faça login.';
  end if;

  select p.id, p.status_pedido, p.codigo_retirada, l.owner_id into v_ped
  from pedidos p
  join lojas l on l.id = p.loja_id
  where p.id = p_pedido_id;
  if not found then
    raise exception 'Pedido não encontrado.';
  end if;
  if v_ped.owner_id <> v_user then
    raise exception 'Apenas o dono da loja pode confirmar este pedido.';
  end if;
  if v_ped.status_pedido <> 'Pagamento Realizado' then
    raise exception 'Pedido ainda não está pago (%).', v_ped.status_pedido;
  end if;
  if v_ped.codigo_retirada is null
     or v_ped.codigo_retirada <> regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g') then
    raise exception 'Código de retirada incorreto.';
  end if;

  insert into entregas (linha_item_id, status, atualizado_em)
  select li.id, 'Entregue', now()
  from linha_itens li
  where li.pedido_id = p_pedido_id
  on conflict (linha_item_id)
  do update set status = 'Entregue', atualizado_em = now();
  get diagnostics v_n = row_count;

  return v_n;
end;
$$;

revoke all on function public.pedido_confirmar_entrega(uuid, text) from public;
grant execute on function public.pedido_confirmar_entrega(uuid, text) to authenticated;

-- ============ 3. Transparência: pedidos pagos por coletiva ============
-- Agregado apenas (contagens) — não expõe participantes. Roda como owner.
create or replace view public.coletiva_pagamentos as
  select cp.coletiva_id,
         count(*)::int as pedidos_gerados,
         count(*) filter (where pe.status_pedido = 'Pagamento Realizado')::int as pedidos_pagos
  from public.coletiva_participacoes cp
  join public.pedidos pe on pe.id = cp.pedido_id
  group by cp.coletiva_id;

grant select on public.coletiva_pagamentos to anon, authenticated;
