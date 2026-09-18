-- 0191: pedido com item já entregue não volta ao estoque nem estorna repasse.
--
-- Achados do code review de 18/09 sobre a 0177 e a 0187.
--
-- 1. 🔴 `pedido_cancelar` só bloqueia `Enviado` e `Cancelado`. Mas a entrega
--    neste sistema não passa por `Enviado`: `pedido_confirmar_entrega` grava
--    `entregas.status = 'Entregue'` e o pedido fica em `Pagamento Realizado`.
--    O seller podia, dias depois de entregar, cancelar pelo painel: a venda
--    sumia, `linha_itens.pago` voltava a false e o repasse pendente virava
--    `estornado`. Furo no dinheiro, acionável por quem já recebeu a mercadoria.
--
-- 2. ⚠ Entrega parcial devolvia ao estoque item que já saiu. Um pedido com
--    parte entregue e o resto ainda em `Aguardando Pagamento` era cancelado
--    pela expiração, e a devolução somava de volta TODAS as reservas do pedido.
--    `pedido_totalmente_entregue` é tudo-ou-nada e não pega esse caso.
--
-- A guarda vai na raiz, `pedido_restaurar_estoque`, por onde passam os quatro
-- caminhos: `pedido_cancelar`, `pedido_cancelar_devolver_estoque`,
-- `estoque_reservas_expirar` (lote, não pode estourar) e o trigger de status
-- (webhook do Asaas). Critério "nenhum item entregue", não "totalmente
-- entregue", para cobrir o parcial. `pedido_cancelar` ganha a recusa explícita,
-- que é o único caminho com usuário na frente e o único que mexe em repasse.
--
-- 3. ⚠ `motivo` da reserva consumida não sobrescrevia o antigo (`coalesce` na
--    0187): as reservas consumidas na entrega continuavam dizendo "Pedido já
--    pago antes da 0177", e a auditoria não distinguia expedição de entrega.
--
-- 4. ⚠ A 0187 zerava `expira_em` ao entrar em `Em Separação` mesmo sem
--    pagamento, e a expiração (que só olha `Aguardando Pagamento` e `ativa`)
--    nunca mais enxergaria a reserva.

-- 1. Critério do parcial: existe ao menos um item entregue?
create or replace function public.pedido_tem_item_entregue(p_pedido_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.linha_itens li
      left join public.entregas en on en.linha_item_id = li.id
     where li.pedido_id = p_pedido_id
       and coalesce(en.status, case when li.entregue then 'Entregue' else 'Pendente' end)
           = 'Entregue'
  );
$$;

-- 2. A guarda, na raiz. Não estoura: a expiração roda em lote.
create or replace function public.pedido_restaurar_estoque(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_motivo text := 'Devolução ao saldo por cancelamento do pedido';
begin
  -- Mercadoria que já saiu não volta ao saldo. Vale também para o parcial:
  -- o que ainda não saiu fica preso na reserva e é resolvido à mão, que é
  -- melhor do que somar de volta unidade que está com o comprador.
  if public.pedido_tem_item_entregue(p_pedido_id) then
    insert into public.auditoria_eventos
      (ator_id, ator_papel, acao, tabela, registro_id, dados_antes, dados_depois)
    values (auth.uid(), 'sistema', 'pedido.estoque_nao_restaurado', 'pedidos', p_pedido_id,
            null,
            jsonb_build_object('motivo', 'pedido tem item entregue',
                               'totalmente_entregue', public.pedido_totalmente_entregue(p_pedido_id)));
    return;
  end if;

  -- Produto: soma por produto, para pedido com o mesmo produto em duas linhas.
  update public.produtos p
     set estoque_atual = p.estoque_atual + r.qtd
    from (
      select produto_id, sum(quantidade) as qtd
        from public.estoque_reservas
       where pedido_id = p_pedido_id
         and venda_futura_id is null
         and status in ('ativa', 'confirmada')
       group by produto_id
    ) r
   where p.id = r.produto_id;

  -- Venda futura: estoque próprio, devolvido ao lugar certo.
  update public.vendas_futuras vf
     set estoque = vf.estoque + r.qtd
    from (
      select venda_futura_id, sum(quantidade) as qtd
        from public.estoque_reservas
       where pedido_id = p_pedido_id
         and venda_futura_id is not null
         and status in ('ativa', 'confirmada')
       group by venda_futura_id
    ) r
   where vf.id = r.venda_futura_id;

  update public.estoque_reservas
     set status = 'liberada',
         motivo = coalesce(motivo, v_motivo),
         expira_em = null,
         resolvido_em = now()
   where pedido_id = p_pedido_id
     and status in ('ativa', 'confirmada');
end;
$$;

-- 3. Cancelamento pelo painel: recusa explícita antes de tocar no dinheiro.
create or replace function public.pedido_cancelar(p_pedido_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_atual text;
begin
  if not (
    public.is_admin()
    or exists (
      select 1 from public.pedidos pe join public.lojas l on l.id = pe.loja_id
      where pe.id = p_pedido_id and l.owner_id = auth.uid()
    )
  ) then
    raise exception 'Sem permissão para cancelar este pedido.';
  end if;
  if p_motivo is null or trim(p_motivo) = '' then
    raise exception 'Motivo é obrigatório.';
  end if;

  select status_pedido into v_atual from public.pedidos where id = p_pedido_id;
  if v_atual is null then
    raise exception 'Pedido não encontrado.';
  end if;
  if v_atual in ('Enviado', 'Cancelado') then
    raise exception 'Pedido em "%" não pode mais ser cancelado.', v_atual;
  end if;
  -- A entrega deixa o pedido em `Pagamento Realizado`, então o status não
  -- denuncia. Sem esta guarda o repasse pendente virava `estornado`.
  if public.pedido_tem_item_entregue(p_pedido_id) then
    raise exception 'Pedido com item já entregue não pode ser cancelado. Abra uma disputa.';
  end if;

  perform public.pedido_restaurar_estoque(p_pedido_id);
  if v_atual = 'Aguardando Pagamento' then
    perform public.cupom_liberar_uso_pedido(p_pedido_id);
  end if;

  update public.pedidos set status_pedido = 'Cancelado' where id = p_pedido_id;
  update public.linha_itens set pago = false
    where pedido_id = p_pedido_id and transferido = false;
  update public.repasses set status = 'estornado'
    where pedido_id = p_pedido_id and status = 'pendente';

  insert into public.auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_antes, dados_depois)
  values (auth.uid(), case when public.is_admin() then 'admin' else 'seller' end,
          'pedido.cancelado', 'pedidos', p_pedido_id,
          jsonb_build_object('status_pedido', v_atual),
          jsonb_build_object('status_pedido', 'Cancelado', 'motivo', p_motivo));
end;
$$;

-- 4. Motivo do consumo passa a sobrescrever: a auditoria precisa distinguir
--    expedição de entrega de backfill.
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
         motivo = coalesce(p_motivo, motivo),
         expira_em = null,
         resolvido_em = now()
   where pedido_id = p_pedido_id
     and status in ('ativa', 'confirmada');
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- 5. `Em Separação` sem pagamento não confirma nem zera `expira_em`.
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

  elsif new.status_pedido = 'Pagamento Realizado'
     or (new.status_pedido = 'Em Separação'
         and old.status_pedido in ('Pagamento Realizado', 'Em Separação')) then
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

revoke all on function public.pedido_tem_item_entregue(uuid) from public, anon, authenticated;
