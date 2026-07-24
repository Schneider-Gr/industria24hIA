-- 0080: janela de pagamento da coletiva fechada + expiração de inadimplentes.
--
-- Problema (apontado na revisão de 24/07/2026): desde a 0077 a coletiva fecha
-- gerando um pedido `Aguardando Pagamento` por participante e já debitando o
-- estoque do grupo inteiro. Se parte do grupo não paga, o seller via "Pagos:
-- 2 de 3" mas não tinha nenhuma alavanca: estoque preso, pedido pendente para
-- sempre. Esta migration dá a alavanca.
--
-- Desenho (decisão do dono): quem PAGOU mantém o pedido e o preço que pagou —
-- não se re-rateia para cima (recobrar depois de pago seria abuso). Quem não
-- paga dentro da janela tem o pedido cancelado e a quantidade devolvida ao
-- estoque. A coletiva segue `Atingida` (os que pagaram são venda válida).
--
-- ponytail: janela fixa de 48h nesta v1. A coluna na regra existe para o dia
-- em que o seller quiser configurá-la por produto — sem UI ainda.

-- ============ 1. Config na regra + prazo de pagamento na coletiva ============
alter table public.coletiva_regras
  add column if not exists prazo_pagamento_horas int not null default 48
  check (prazo_pagamento_horas between 1 and 168);

alter table public.compras_coletivas
  add column if not exists pagamento_ate timestamptz;

-- ============ 2. Novo tipo de evento ============
alter table public.coletiva_eventos drop constraint if exists coletiva_eventos_tipo_check;
alter table public.coletiva_eventos add constraint coletiva_eventos_tipo_check
  check (tipo in (
    'criada', 'participante_entrou', 'lote_desbloqueado', 'meta_atingida',
    'prazo_proximo', 'fechada', 'expirada', 'cancelada', 'agente',
    'pagamento_expirado'));

-- ============ 3. Deadline setado no fechamento (trigger, sem tocar na RPC) ============
-- coletiva_fechar (0077) é o caminho do dinheiro; em vez de reescrevê-la só pra
-- gravar um timestamp, um trigger BEFORE UPDATE carimba pagamento_ate na
-- transição para Atingida. Coletivas já Atingidas (pagamento_ate null) não são
-- afetadas retroativamente — a expiração as ignora.
create or replace function public.coletiva_set_pagamento_ate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Atingida'
     and old.status is distinct from 'Atingida'
     and new.pagamento_ate is null then
    new.pagamento_ate := now() + make_interval(hours =>
      coalesce((select prazo_pagamento_horas from coletiva_regras where id = new.regra_id), 48));
  end if;
  return new;
end;
$$;

drop trigger if exists coletiva_set_pagamento_ate_trg on public.compras_coletivas;
create trigger coletiva_set_pagamento_ate_trg
  before update on public.compras_coletivas
  for each row execute function public.coletiva_set_pagamento_ate();

-- ============ 4. Expirar pagamentos: cancela não pagos, devolve estoque ============
-- Idempotente: só toca pedidos ainda em 'Aguardando Pagamento', então uma
-- segunda chamada não devolve estoque duas vezes. Serializada por `for update`.
create or replace function public.coletiva_expirar_pagamentos(p_coletiva_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_col record;
  v_owner uuid;
  v_part record;
  v_cancelados int := 0;
  v_qtd_devolvida int := 0;
begin
  select c.*, l.owner_id into v_col
  from compras_coletivas c
  join lojas l on l.id = c.loja_id
  where c.id = p_coletiva_id
  for update of c;
  if not found then
    raise exception 'Compra coletiva não encontrada.';
  end if;
  v_owner := v_col.owner_id;

  -- Só o dono aciona manualmente; a varredura roda como service_role (uid null).
  if auth.uid() is not null and auth.uid() <> v_owner then
    raise exception 'Apenas o dono da loja pode encerrar os pagamentos.';
  end if;

  if v_col.status <> 'Atingida' then
    return jsonb_build_object('cancelados', 0, 'motivo', 'coletiva não está fechada');
  end if;
  if v_col.pagamento_ate is null or v_col.pagamento_ate > now() then
    return jsonb_build_object('cancelados', 0, 'motivo', 'janela de pagamento ainda aberta');
  end if;

  for v_part in
    select cp.id as part_id, cp.quantidade, p.id as pedido_id
    from coletiva_participacoes cp
    join pedidos p on p.id = cp.pedido_id
    where cp.coletiva_id = v_col.id
      and p.status_pedido = 'Aguardando Pagamento'
    for update of p
  loop
    update pedidos set status_pedido = 'Cancelado' where id = v_part.pedido_id;
    update produtos set estoque_atual = estoque_atual + v_part.quantidade
      where id = v_col.produto_id;
    v_cancelados := v_cancelados + 1;
    v_qtd_devolvida := v_qtd_devolvida + v_part.quantidade;
  end loop;

  if v_cancelados > 0 then
    perform coletiva_evento(v_col.id, 'pagamento_expirado',
      jsonb_build_object('cancelados', v_cancelados, 'qtd_devolvida', v_qtd_devolvida));
  end if;

  return jsonb_build_object(
    'cancelados', v_cancelados,
    'qtd_devolvida', v_qtd_devolvida);
end;
$$;

revoke all on function public.coletiva_expirar_pagamentos(uuid) from public;
grant execute on function public.coletiva_expirar_pagamentos(uuid) to authenticated, service_role;
