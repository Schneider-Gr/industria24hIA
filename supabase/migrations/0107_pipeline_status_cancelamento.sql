-- 0107: pipeline pós-pagamento (Em Separação, Enviado) + cancelamento
-- explícito com reposição de estoque.
--
-- Nenhum doc confirmado (docs/business-rules.md, docs/backend-workflows.md)
-- descreve este pipeline — backend-workflows.md é rascunho inferido, não
-- validado. Na ausência de fonte confirmada, a transição é implementada de
-- forma conservadora e linear (sem pular etapas):
--   Aguardando Pagamento -> Pagamento Realizado -> Em Separação -> Enviado
-- Cancelamento pode ocorrer a partir de qualquer status anterior a Enviado.
-- Decisão de escopo (esta sessão, 2026-08-06): estorno financeiro real via
-- Asaas continua fora de escopo, seguindo a mesma decisão já registrada em
-- 0084 (admin_estornar_pedido) — só reversão interna (status + estoque +
-- ledger de repasses).

alter table public.pedidos
  drop constraint if exists pedidos_status_pedido_check,
  add constraint pedidos_status_pedido_check
    check (status_pedido in (
      'Aguardando Pagamento', 'Pagamento Realizado',
      'Em Separação', 'Enviado', 'Cancelado'
    ));

-- Avança o pedido uma etapa no pipeline pós-pagamento. Só admin ou o dono
-- da loja do pedido; valida a transição no próprio estado atual (sem pular
-- etapa) — é o único caminho de escrita de status_pedido além do webhook
-- Asaas e do cancelamento abaixo, então a checagem aqui já cobre toda
-- escrita de UI.
create or replace function public.pedido_avancar_status(p_pedido_id uuid, p_novo_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_atual text;
  v_proximo text;
begin
  if not (
    public.is_admin()
    or exists (
      select 1 from public.pedidos pe join public.lojas l on l.id = pe.loja_id
      where pe.id = p_pedido_id and l.owner_id = auth.uid()
    )
  ) then
    raise exception 'Sem permissão para alterar este pedido.';
  end if;

  select status_pedido into v_atual from public.pedidos where id = p_pedido_id;
  if v_atual is null then
    raise exception 'Pedido não encontrado.';
  end if;

  v_proximo := case v_atual
    when 'Pagamento Realizado' then 'Em Separação'
    when 'Em Separação' then 'Enviado'
    else null
  end;

  if v_proximo is null or v_proximo is distinct from p_novo_status then
    raise exception 'Transição de status inválida: % -> %.', v_atual, p_novo_status;
  end if;

  update public.pedidos set status_pedido = p_novo_status where id = p_pedido_id;

  insert into public.auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_antes, dados_depois)
  values (auth.uid(), case when public.is_admin() then 'admin' else 'seller' end,
          'pedido.status_avancado', 'pedidos', p_pedido_id,
          jsonb_build_object('status_pedido', v_atual),
          jsonb_build_object('status_pedido', p_novo_status));
end;
$$;

-- Reposição de estoque compartilhada entre os dois caminhos de cancelamento
-- que existem no repo: o webhook Asaas via pedido_cancelar_devolver_estoque
-- (0024/0032, service_role, só a partir de 'Aguardando Pagamento') e o
-- cancelamento manual admin/seller abaixo (pedido_cancelar). Antes da
-- extração, pedido_cancelar_devolver_estoque fazia `update ... from
-- linha_itens li where li.produto_id = p.id` sem agrupar por produto — com
-- duas linhas do mesmo produto no mesmo pedido, o UPDATE...FROM do Postgres
-- só aplica uma delas (não soma as duas). Agrupar por produto_id corrige
-- isso nos dois caminhos.
create or replace function public.pedido_restaurar_estoque(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.produtos p
  set estoque_atual = p.estoque_atual + li.qtd
  from (
    select produto_id, sum(quantidade) as qtd
    from public.linha_itens
    where pedido_id = p_pedido_id and produto_id is not null
    group by produto_id
  ) li
  where p.id = li.produto_id;
end;
$$;

revoke all on function public.pedido_restaurar_estoque(uuid) from public, anon, authenticated;

-- Cancelamento explícito (admin ou seller dono da loja), a partir de
-- qualquer status anterior a 'Enviado'.
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

  perform public.pedido_restaurar_estoque(p_pedido_id);

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

-- admin_estornar_pedido (0084) vira um wrapper fino sobre pedido_cancelar,
-- mantendo a assinatura já usada por src/app/(admin)/admin/pedidos/actions.ts
-- (ponytail: uma função só faz a checagem de estado/estoque; evita duplicar
-- a lógica de cancelamento entre admin e seller).
create or replace function public.admin_estornar_pedido(p_pedido_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas admin.';
  end if;
  perform public.pedido_cancelar(p_pedido_id, p_motivo);
end;
$$;

revoke all on function public.pedido_avancar_status(uuid, text) from public, anon;
grant execute on function public.pedido_avancar_status(uuid, text) to authenticated;
revoke all on function public.pedido_cancelar(uuid, text) from public, anon;
grant execute on function public.pedido_cancelar(uuid, text) to authenticated;

-- pedido_cancelar_devolver_estoque (0024/0032, webhook Asaas) passa a usar
-- o mesmo helper de reposição — guarda de papel (service_role) e a condição
-- de estado ('Aguardando Pagamento' apenas) continuam iguais, só a soma por
-- produto foi extraída.
create or replace function public.pedido_cancelar_devolver_estoque(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jwt_role text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
begin
  if v_jwt_role is not null and v_jwt_role <> 'service_role' then
    raise exception 'pedido_cancelar_devolver_estoque: apenas service_role';
  end if;

  if not exists (
    select 1 from pedidos
    where id = p_pedido_id and status_pedido = 'Aguardando Pagamento'
  ) then
    return;
  end if;

  perform public.pedido_restaurar_estoque(p_pedido_id);

  update pedidos set status_pedido = 'Cancelado' where id = p_pedido_id;
end;
$$;

revoke all on function public.pedido_cancelar_devolver_estoque(uuid) from public;
grant execute on function public.pedido_cancelar_devolver_estoque(uuid) to service_role;
