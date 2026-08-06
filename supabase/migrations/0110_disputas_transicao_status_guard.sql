-- 0110: fecha o gap de RLS encontrado na auditoria do sistema de disputa/
-- arbitragem (2026-08-06, PRD 009): as policies disputas_seller_update e
-- disputas_comprador_update (0104) permitem UPDATE em qualquer valor de
-- `status` da máquina de estados, sem checar se a transição é válida para o
-- papel de quem está alterando. O guard_campos_restritos() já bloqueia os
-- campos de decisão (só admin), mas não validava a transição de `status`
-- em si — então, via client Supabase direto (bypassando as server actions
-- em src/app/pedido/[id]/disputa/actions.ts e
-- src/app/(seller)/seller/disputas/actions.ts), era possível:
--   - a loja reverter uma disputa de 'em_mediacao_admin' para
--     'em_atendimento_loja', tirando o caso da fila de arbitragem do admin
--     sem o comprador concordar;
--   - o comprador forçar 'em_mediacao_admin' a qualquer momento, ignorando
--     o SLA de 48h (`sla_loja_vence_em`) que hoje só é checado em
--     escalarParaAdmin(), na aplicação.
--
-- Esta migration estende o branch `disputas` de guard_campos_restritos()
-- (reconstruído em 0109) para validar a transição de status por papel,
-- espelhando exatamente as regras que já existem em código
-- (abrirDisputa/escalarParaAdmin/marcarResolvidaPelaLoja/decidirDisputa):
--   - loja: só pode setar 'em_atendimento_loja' ou 'resolvida_pela_loja',
--     e só a partir de 'aberta'/'em_atendimento_loja' (nunca depois de
--     escalada pro admin ou já decidida).
--   - comprador: só pode setar 'em_mediacao_admin', e só se o SLA da loja
--     já venceu (mesma regra de escalarParaAdmin) ou se a loja marcou
--     'aguardando_confirmacao_comprador' e o comprador está recusando a
--     resolução.
-- Qualquer outra transição de status por não-admin é rejeitada.

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
    if tg_op = 'UPDATE' then
      if new.status = 'resolvida'
        or new.decisao is distinct from old.decisao
        or new.decisao_valor is distinct from old.decisao_valor
        or new.decisao_justificativa is distinct from old.decisao_justificativa
        or new.decidida_em is distinct from old.decidida_em
        or new.decidida_por is distinct from old.decidida_por
      then
        raise exception 'Apenas admin decide o desfecho final da disputa.';
      end if;

      -- 0110: valida a transição de status por papel (loja vs. comprador),
      -- espelhando a regra que hoje só existe nas server actions.
      if new.status is distinct from old.status then
        if exists (
          select 1 from public.lojas l where l.id = old.loja_id and l.owner_id = auth.uid()
        ) then
          -- loja: só avança dentro do próprio atendimento, nunca depois de
          -- escalada pro admin ou já decidida.
          if not (
            old.status in ('aberta', 'em_atendimento_loja')
            and new.status in ('em_atendimento_loja', 'resolvida_pela_loja')
          ) then
            raise exception 'Transição de status da disputa não permitida para a loja.';
          end if;
        elsif old.comprador_id = auth.uid() then
          -- comprador: só escala pro admin, e só com SLA vencido ou
          -- recusando uma resolução da loja.
          if not (
            new.status = 'em_mediacao_admin'
            and (
              (old.status in ('aberta', 'em_atendimento_loja') and now() >= old.sla_loja_vence_em)
              or old.status = 'aguardando_confirmacao_comprador'
            )
          ) then
            raise exception 'Transição de status da disputa não permitida para o comprador.';
          end if;
        else
          raise exception 'Apenas participantes da disputa alteram seu status.';
        end if;
      end if;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
