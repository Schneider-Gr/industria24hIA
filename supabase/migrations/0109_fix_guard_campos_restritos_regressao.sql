-- 0109: 0104 (disputas) fez CREATE OR REPLACE de guard_campos_restritos()
-- reescrevendo a função do zero para adicionar o branch de `disputas`, e
-- descartou por acidente toda a evolução acumulada desde 0031/0035/0038/0074:
--
--   1. Bypass `app.checkout_rpc` (0038/0074) — sem ele, o INSERT de
--      linha_itens feito pela RPC de checkout (que grava repasse_ind/
--      repasse_afiliado/repasse_vendedor na criação, em nome do comprador
--      logado) volta a cair no guard e falhar, quebrando o checkout.
--   2. Proteção de `chave_pix`/`tipo_chave_pix` da loja (0035) — troca de
--      chave PIX deixou de exigir a RPC `alterar_chave_pix_loja`.
--   3. Guards de INSERT em `pedidos` e `linha_itens` (0031/0074) — um
--      INSERT de linha_itens ou pedido não-admin podia setar campos
--      financeiros (pago, repasse_*, dt_pagamento) livremente na criação.
--   4. Tratamento de DELETE (0031/0074): a função não tinha nenhum branch
--      que retornasse `old` em DELETE, então o fallback `return new` — que
--      em DELETE é sempre NULL — cancela silenciosamente qualquer exclusão
--      em produtos/lojas/pedidos/linha_itens/disputas, para qualquer role
--      (achado durante auditoria 2026-08-06, confirmado até para
--      `postgres`/service_role). Também derrubou os guards que bloqueavam
--      DELETE de pedido/item já pago (0074).
--
-- Esta migration reconstrói a função combinando a lógica completa da 0074
-- com o branch de `disputas` da 0104, mais o fallback de DELETE correto.
-- Nenhuma trigger precisa ser recriada — todas (`guard_produtos_moderacao`,
-- `guard_lojas_moderacao`, `guard_pedidos_financeiro`,
-- `guard_linha_itens_financeiro`, `guard_disputas_decisao`, etc.) já
-- apontam para `guard_campos_restritos()` por nome.

create or replace function public.guard_campos_restritos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role/postgres (auth.uid() null) e admins passam.
  if auth.uid() is null or public.is_admin() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  -- RPCs de checkout (security definer) sinalizam via app.checkout_rpc
  -- (set_config local à transação). Sem isto, INSERT de linha_itens com
  -- repasse_* na criação do pedido (checkout_criar_pedido) e o UPDATE de
  -- repasse_afiliado (?ref=, 0065)/desconto de frete consolidado (0074)
  -- morrem no guard.
  if coalesce(current_setting('app.checkout_rpc', true), '') = 'on' then
    if tg_op = 'DELETE' then
      return old;
    end if;
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
    if tg_op = 'UPDATE' and new.situacao is distinct from old.situacao then
      raise exception 'Apenas admin altera a situação da loja (moderação).';
    end if;
    if tg_op = 'UPDATE'
       and (new.chave_pix is distinct from old.chave_pix
            or new.tipo_chave_pix is distinct from old.tipo_chave_pix)
       and coalesce(current_setting('app.chave_pix_rpc', true), '') <> 'on' then
      raise exception 'Troca de chave PIX só pela função alterar_chave_pix_loja.';
    end if;

  elsif tg_table_name = 'pedidos' then
    if tg_op = 'INSERT' then
      if new.repasse_ind24 is not null
        or new.valor_recebido_industria is not null
        or new.asaas_cobranca_id is not null
        or new.link_cobranca is not null
        or new.dt_pagamento is not null
      then
        raise exception 'Apenas admin define campos financeiros do pedido na criação.';
      end if;
    elsif tg_op = 'UPDATE' and (
         new.valor_pedido is distinct from old.valor_pedido
      or new.repasse_ind24 is distinct from old.repasse_ind24
      or new.valor_recebido_industria is distinct from old.valor_recebido_industria
      or new.asaas_cobranca_id is distinct from old.asaas_cobranca_id
      or new.link_cobranca is distinct from old.link_cobranca
      or new.dt_pagamento is distinct from old.dt_pagamento
    ) then
      raise exception 'Apenas admin altera campos financeiros do pedido.';
    elsif tg_op = 'DELETE' and (
      old.dt_pagamento is not null or old.valor_recebido_industria is not null
    ) then
      raise exception 'Apenas admin apaga pedido já pago.';
    end if;

  elsif tg_table_name = 'linha_itens' then
    if tg_op = 'INSERT' then
      if new.pago is true
        or new.transferido is true
        or new.repasse_ind is not null
        or new.repasse_afiliado is not null
        or new.repasse_vendedor is not null
        or new.dt_pagamento_cliente is not null
      then
        raise exception 'Apenas admin define campos financeiros do item na criação.';
      end if;
    elsif tg_op = 'UPDATE' and (
         new.valor is distinct from old.valor
      or new.pago is distinct from old.pago
      or new.transferido is distinct from old.transferido
      or new.repasse_ind is distinct from old.repasse_ind
      or new.repasse_afiliado is distinct from old.repasse_afiliado
      or new.repasse_vendedor is distinct from old.repasse_vendedor
      or new.dt_pagamento_cliente is distinct from old.dt_pagamento_cliente
    ) then
      raise exception 'Apenas admin altera campos financeiros do item.';
    elsif tg_op = 'DELETE' and (old.pago is true or old.transferido is true) then
      raise exception 'Apenas admin apaga item já pago/transferido.';
    end if;

  elsif tg_table_name = 'disputas' then
    if tg_op = 'UPDATE' and (
         new.status = 'resolvida'
      or new.decisao is distinct from old.decisao
      or new.decisao_valor is distinct from old.decisao_valor
      or new.decisao_justificativa is distinct from old.decisao_justificativa
      or new.decidida_em is distinct from old.decidida_em
      or new.decidida_por is distinct from old.decidida_por
    ) then
      raise exception 'Apenas admin decide o desfecho final da disputa.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
