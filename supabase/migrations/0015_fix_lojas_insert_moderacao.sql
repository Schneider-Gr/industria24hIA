-- 0015: fix bug hunt 08/07 (CRIT) — loja nasce 'Ativa' e escapa da moderação.
--
-- 0006 define lojas.situacao default 'Ativa'. guard_lojas_moderacao (0012) só
-- roda em UPDATE, então o INSERT do seller (policy lojas_owner_all, for all)
-- cria a loja já 'Ativa': aparece na vitrine e libera produtos_public_read
-- sem aprovação do admin. Fecha o mesmo buraco que 0012 já fechou para
-- produtos (que exige nascer 'Pendente').

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
    elsif new.status_produto is distinct from old.status_produto then
      raise exception 'Apenas admin altera status_produto (moderação).';
    end if;

  elsif tg_table_name = 'lojas' then
    if tg_op = 'INSERT' then
      if new.situacao = 'Ativa' then
        raise exception 'Loja nova não pode nascer Ativa; aprovação é do admin.';
      end if;
    elsif new.situacao is distinct from old.situacao then
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

drop trigger if exists guard_lojas_moderacao on public.lojas;
create trigger guard_lojas_moderacao
  before insert or update on public.lojas
  for each row execute function public.guard_campos_restritos();

-- Lojas existentes já Ativas não são afetadas (só barra INSERTs novos).
