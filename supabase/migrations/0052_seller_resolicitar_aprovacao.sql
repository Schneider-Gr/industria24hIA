-- 0052: permite o seller reenviar produto Recusado/Em analise pra fila de
-- moderação (status_produto -> 'Pendente'), sem abrir brecha de
-- auto-aprovação. O guard de 0012 bloqueava QUALQUER mudança de
-- status_produto pelo dono; aqui só a transição para 'Pendente' passa a ser
-- permitida ao dono da loja, decisão de aprovar continua exclusiva de admin.
-- Corpo completo copiado de 0012 (create or replace na mesma função), só o
-- bloco `produtos` muda.

create or replace function public.guard_campos_restritos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_table_name = 'produtos' then
    if tg_op = 'INSERT' then
      if new.status_produto is distinct from 'Pendente' then
        raise exception 'Produto novo nasce Pendente; aprovação é do admin.';
      end if;
    elsif new.status_produto is distinct from old.status_produto
          and new.status_produto is distinct from 'Pendente' then
      raise exception 'Apenas admin altera status_produto (moderação). Dono só pode reenviar para Pendente.';
    end if;

  elsif tg_table_name = 'lojas' then
    if tg_op = 'UPDATE' and new.situacao is distinct from old.situacao then
      raise exception 'Apenas admin altera a situação da loja (moderação).';
    end if;

  elsif tg_table_name = 'pedidos' then
    if tg_op = 'UPDATE' and (
         new.valor_pedido is distinct from old.valor_pedido
      or new.repasse_ind24 is distinct from old.repasse_ind24
      or new.valor_recebido_industria is distinct from old.valor_recebido_industria
      or new.asaas_cobranca_id is distinct from old.asaas_cobranca_id
      or new.link_cobranca is distinct from old.link_cobranca
      or new.dt_pagamento is distinct from old.dt_pagamento
    ) then
      raise exception 'Apenas admin altera campos financeiros do pedido.';
    end if;

  elsif tg_table_name = 'linha_itens' then
    if tg_op = 'UPDATE' and (
         new.valor is distinct from old.valor
      or new.pago is distinct from old.pago
      or new.transferido is distinct from old.transferido
      or new.repasse_ind is distinct from old.repasse_ind
      or new.repasse_afiliado is distinct from old.repasse_afiliado
      or new.repasse_vendedor is distinct from old.repasse_vendedor
      or new.dt_pagamento_cliente is distinct from old.dt_pagamento_cliente
    ) then
      raise exception 'Apenas admin altera campos financeiros do item.';
    end if;
  end if;

  return new;
end;
$$;
