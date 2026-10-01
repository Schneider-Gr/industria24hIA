-- 0210: entrega de item de venda futura só vale com o código do comprador.
--
-- Revisão de 01/10/2026 (change venda-futura-custodia-e-avisos). O repasse ao
-- seller já espera a entrega (`repasse_solicitar_pedido` exige todo item
-- `Entregue`), mas a entrega era autodeclarada: `entregas_seller_all` deixa o
-- dono da loja gravar `Entregue` pelo checkbox do painel. Numa reserva para
-- daqui a 45 dias, o seller marcava entregue hoje e sacava o PIX antes de
-- produzir — o "dinheiro retido até a entrega" não segurava nada.
--
-- Critério: escrita direta do cliente (`authenticated`/`anon`) não pode levar
-- item de venda futura a `Entregue`. As RPCs que validam o código
-- (`pedido_confirmar_entrega`, `pedido_confirmar_entrega_publico`) são
-- security definer com dono `postgres`, então rodam com outro `current_user` e
-- passam. Admin passa para resolver caso de exceção à mão.
-- ponytail: pedido comum segue no checkbox; escrow geral (liberar_em) fica no
-- PRD compra-garantida-escrow.

create or replace function public.entregas_venda_futura_exige_codigo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'Entregue'
     and (tg_op = 'INSERT' or old.status is distinct from 'Entregue')
     and current_user in ('authenticated', 'anon')
     and not public.is_admin()
     and exists (
       select 1 from public.linha_itens li
        where li.id = new.linha_item_id
          and li.venda_futura_id is not null
     ) then
    raise exception 'Item de venda futura só é entregue com o código do comprador. Peça o código e confirme em "Confirmar entrega".';
  end if;
  return new;
end;
$$;

drop trigger if exists entregas_venda_futura_exige_codigo on public.entregas;
create trigger entregas_venda_futura_exige_codigo
  before insert or update of status on public.entregas
  for each row execute function public.entregas_venda_futura_exige_codigo();
