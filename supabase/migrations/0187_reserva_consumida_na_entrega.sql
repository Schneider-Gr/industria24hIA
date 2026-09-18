-- 0187: reserva de estoque consumida na ENTREGA, não só no status `Enviado`.
--
-- Medido em produção em 18/09/2026: 199 reservas `confirmada` (29.258 un) em
-- 135 pedidos, de 20/06/2025 a 24/08/2026. Em 123 desses pedidos todo item já
-- está entregue (29.057 un), e mesmo assim a reserva nunca resolve.
--
-- Causa: a 0177 só consome reserva quando o pedido vai para `Enviado`. Mas a
-- entrega neste sistema não passa por `Enviado`: `pedido_confirmar_entrega`
-- (0090/0111) grava `entregas.status = 'Entregue'` e o pedido fica em
-- `Pagamento Realizado`. Os pedidos do Bubble têm só a flag legada
-- `linha_itens.entregue`. `pedidos.status_pedido` não tem `Entregue` nem
-- `Retirado` (CHECK com 5 valores), então não há status a escutar.
--
-- Regra (a mesma que libera repasse na 0158): pedido com item e com TODO item
-- entregue, por `entregas.status` ou, sem linha em `entregas`, pela flag
-- legada, consome as reservas `ativa`/`confirmada`. Cancelado segue liberando
-- (0177, inalterado). `Em Separação` passa a confirmar a reserva ativa, como o
-- pagamento: separar pedido não pago não existe, e sem isso a reserva vence e
-- a expiração não a enxerga (ela só olha `Aguardando Pagamento`).
--
-- Consumir não mexe em número: o disponível já caiu na criação do pedido
-- (0177). Muda o estado, e com ele o físico derivado (disponível + reservas
-- abertas) deixa de contar 29 mil unidades que já saíram.

-- 1. Critério único de "pedido entregue"
create or replace function public.pedido_totalmente_entregue(p_pedido_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.linha_itens li where li.pedido_id = p_pedido_id)
     and not exists (
       select 1
         from public.linha_itens li
         left join public.entregas en on en.linha_item_id = li.id
        where li.pedido_id = p_pedido_id
          and coalesce(en.status, case when li.entregue then 'Entregue' else 'Pendente' end)
              <> 'Entregue'
     );
$$;

create or replace function public.pedido_consumir_reservas(p_pedido_id uuid, p_motivo text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  update public.estoque_reservas
     set status = 'consumida',
         motivo = coalesce(motivo, p_motivo),
         expira_em = null,
         resolvido_em = now()
   where pedido_id = p_pedido_id
     and status in ('ativa', 'confirmada');
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- 2. Entrega confirmada consome
create or replace function public.entrega_consome_reserva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido uuid;
begin
  if new.status <> 'Entregue' then
    return new;
  end if;

  select pedido_id into v_pedido from public.linha_itens where id = new.linha_item_id;

  if v_pedido is not null and public.pedido_totalmente_entregue(v_pedido) then
    perform public.pedido_consumir_reservas(v_pedido, 'Pedido entregue');
  end if;

  return new;
end;
$$;

drop trigger if exists entregas_consome_reserva on public.entregas;
create trigger entregas_consome_reserva
  after insert or update of status on public.entregas
  for each row execute function public.entrega_consome_reserva();

-- Flag legada: quem ainda marca linha_itens.entregue sem linha em entregas.
create or replace function public.linha_item_entregue_consome_reserva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.entregue and not coalesce(old.entregue, false)
     and public.pedido_totalmente_entregue(new.pedido_id) then
    perform public.pedido_consumir_reservas(new.pedido_id, 'Pedido entregue');
  end if;
  return new;
end;
$$;

drop trigger if exists linha_itens_entregue_consome_reserva on public.linha_itens;
create trigger linha_itens_entregue_consome_reserva
  after update of entregue on public.linha_itens
  for each row execute function public.linha_item_entregue_consome_reserva();

-- 3. Status do pedido: igual à 0177, com `Em Separação` confirmando.
create or replace function public.pedido_reservas_pelo_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status_pedido = old.status_pedido then
    return new;
  end if;

  if new.status_pedido = 'Cancelado' then
    perform public.pedido_restaurar_estoque(new.id);

  elsif new.status_pedido in ('Pagamento Realizado', 'Em Separação') then
    update public.estoque_reservas
       set status = 'confirmada', expira_em = null
     where pedido_id = new.id and status = 'ativa';

    if new.status_pedido = 'Pagamento Realizado'
       and not exists (
         select 1 from public.estoque_reservas
          where pedido_id = new.id and status in ('ativa', 'confirmada')
       ) and exists (
         select 1 from public.estoque_reservas
          where pedido_id = new.id and status = 'liberada'
            and motivo = 'Reserva expirada sem pagamento'
       ) then
      insert into public.auditoria_eventos
        (ator_id, ator_papel, acao, tabela, registro_id, dados_antes, dados_depois)
      values (null, 'sistema', 'pedido.pago_sem_reserva', 'pedidos', new.id,
              jsonb_build_object('status_pedido', old.status_pedido),
              jsonb_build_object('status_pedido', new.status_pedido,
                                 'pendencia', 'reserva expirada antes do pagamento'));
    end if;

  elsif new.status_pedido = 'Enviado' then
    perform public.pedido_consumir_reservas(new.id, 'Pedido expedido');
  end if;

  return new;
end;
$$;

-- 4. Backfill: pedidos já entregues cujas reservas ficaram abertas.
select public.pedido_consumir_reservas(p.id, 'Pedido entregue (backfill 0187)')
  from public.pedidos p
 where p.status_pedido <> 'Cancelado'
   and exists (select 1 from public.estoque_reservas r
                where r.pedido_id = p.id and r.status in ('ativa', 'confirmada'))
   and public.pedido_totalmente_entregue(p.id);

-- Funções de backend: ninguém de fora chama (mesma política da 0183).
revoke all on function public.pedido_totalmente_entregue(uuid) from public, anon, authenticated;
revoke all on function public.pedido_consumir_reservas(uuid, text) from public, anon, authenticated;
revoke all on function public.entrega_consome_reserva() from public, anon, authenticated;
revoke all on function public.linha_item_entregue_consome_reserva() from public, anon, authenticated;
