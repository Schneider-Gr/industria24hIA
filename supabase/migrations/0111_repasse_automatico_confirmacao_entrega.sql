-- 0111: repasse automático ao seller disparado pela confirmação de entrega
-- (token do comprador digitado pelo entregador/lojista).
--
-- Reabre o Processo 2 de docs/e4-split-repasse-bpmn.md, que tinha sido
-- revertido em 03/08/2026 (PR #43 fechado) em favor do ledger 100% manual
-- da 0084 — decisão de reabrir tomada explicitamente pelo dono nesta data,
-- ciente do trade-off de custódia (o valor do pedido inteiro passa pela
-- conta Asaas da Indústria24h antes do repasse; ver seção "Achado central"
-- do doc). O split nativo do Asaas (walletId) segue descartado, como já
-- decidido em 10/07 — o mecanismo é Transferência PIX (POST /v3/transfers)
-- para `lojas.chave_pix`, não split no ato do pagamento.
--
-- Só o repasse ao SELLER é automatizado aqui. Repasse ao afiliado segue
-- manual: D-E4.1 (chave PIX por afiliado, hoje inexistente em `afiliacoes`)
-- continua em aberto — não inventar coluna nesta migration.

-- Extrai o corpo de calcular_repasses_pedido (0084) para uma função interna
-- sem o gate de is_admin(), chamável de dentro de pedido_confirmar_entrega
-- (mesmo dono/SECURITY DEFINER; nested call não passa pelos grants de PUBLIC).
create or replace function public.repasses_recalcular_pedido(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loja_id uuid;
begin
  select loja_id into v_loja_id from public.pedidos where id = p_pedido_id;
  if v_loja_id is null then
    raise exception 'Pedido não encontrado.';
  end if;

  insert into public.repasses (pedido_id, destino, loja_id, valor)
  select p_pedido_id, 'seller', v_loja_id, coalesce(sum(li.repasse_vendedor), 0)
  from public.linha_itens li
  where li.pedido_id = p_pedido_id
  having coalesce(sum(li.repasse_vendedor), 0) > 0
  on conflict (pedido_id, destino, afiliado_id)
  do update set valor = excluded.valor
  where public.repasses.status = 'pendente';

  insert into public.repasses (pedido_id, destino, loja_id, afiliado_id, valor)
  select p_pedido_id, 'afiliado', v_loja_id, li.afiliado_id, sum(li.repasse_afiliado)
  from public.linha_itens li
  where li.pedido_id = p_pedido_id and li.afiliado_id is not null
  group by li.afiliado_id
  having sum(li.repasse_afiliado) > 0
  on conflict (pedido_id, destino, afiliado_id)
  do update set valor = excluded.valor
  where public.repasses.status = 'pendente';
end;
$$;

revoke all on function public.repasses_recalcular_pedido(uuid) from public, anon, authenticated;

-- calcular_repasses_pedido (0084, usada pelo admin) vira wrapper fino, sem
-- mudar a superfície pública já existente.
create or replace function public.calcular_repasses_pedido(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas admin.';
  end if;
  perform public.repasses_recalcular_pedido(p_pedido_id);
end;
$$;

-- pedido_confirmar_entrega (0090) passa a recalcular o ledger de repasses no
-- momento em que a entrega é confirmada de verdade (não no retorno
-- idempotente 0, nem no código errado -1) — só popula/atualiza `repasses`;
-- quem efetivamente dispara a transferência PIX é o app (lib/repasses.ts),
-- porque Postgres não faz chamada HTTP à API do Asaas aqui.
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
  v_eh_dono boolean;
  v_eh_entregador boolean;
  c_limite_tentativas constant int := 5;
begin
  if v_user is null then
    raise exception 'Faça login.';
  end if;

  select p.id, p.status_pedido, p.codigo_retirada, p.codigo_tentativas, l.owner_id
    into v_ped
  from pedidos p
  join lojas l on l.id = p.loja_id
  where p.id = p_pedido_id;
  if not found then
    raise exception 'Pedido não encontrado.';
  end if;

  v_eh_dono := v_ped.owner_id = v_user;

  select exists (
    select 1 from corridas c
    where c.pedido_id = p_pedido_id
      and c.status <> 'Cancelada'
      and (
        c.afiliado_exclusivo_id = v_user
        or exists (
          select 1 from parceiros_logisticos pl
          where pl.id = c.parceiro_id and pl.user_id = v_user
        )
      )
  ) into v_eh_entregador;

  if not (v_eh_dono or v_eh_entregador) then
    raise exception 'Apenas o dono da loja ou o entregador da corrida pode confirmar este pedido.';
  end if;

  if v_ped.status_pedido <> 'Pagamento Realizado' then
    raise exception 'Pedido ainda não está pago (%).', v_ped.status_pedido;
  end if;

  if not exists (
    select 1 from linha_itens li
    join entregas en on en.linha_item_id = li.id
    where li.pedido_id = p_pedido_id and en.status <> 'Entregue'
  ) and exists (
    select 1 from linha_itens li
    join entregas en on en.linha_item_id = li.id
    where li.pedido_id = p_pedido_id
  ) then
    return 0;
  end if;

  if not v_eh_dono and v_ped.codigo_tentativas >= c_limite_tentativas then
    raise exception 'Muitas tentativas incorretas. Peça ao lojista para concluir esta entrega.';
  end if;

  if v_ped.codigo_retirada is null
     or v_ped.codigo_retirada <> regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g') then
    if not v_eh_dono then
      update pedidos set codigo_tentativas = codigo_tentativas + 1 where id = p_pedido_id;
    end if;
    return -1;
  end if;

  insert into entregas (linha_item_id, status, atualizado_em)
  select li.id, 'Entregue', now()
  from linha_itens li
  where li.pedido_id = p_pedido_id
  on conflict (linha_item_id)
  do update set status = 'Entregue', atualizado_em = now();
  get diagnostics v_n = row_count;

  update pedidos set codigo_tentativas = 0 where id = p_pedido_id;

  -- Só recalcula o ledger na confirmação real (v_n > 0) — o retorno
  -- idempotente já saiu antes (return 0), então v_n aqui é sempre > 0.
  perform public.repasses_recalcular_pedido(p_pedido_id);

  return v_n;
end;
$$;

revoke all on function public.pedido_confirmar_entrega(uuid, text) from public;
grant execute on function public.pedido_confirmar_entrega(uuid, text) to authenticated;
