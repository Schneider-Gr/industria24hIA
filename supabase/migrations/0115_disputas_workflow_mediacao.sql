-- 0115: fecha o buraco de workflow encontrado em revisão de fluxo (PRD 009,
-- brainstorm 2026-08-10, ver openspec/specs/pos-venda-disputas/spec.md):
--
-- Os status `em_atendimento_loja` e `aguardando_confirmacao_comprador` já
-- existiam no CHECK constraint de `disputas` (0104) e o guard de 0110 já
-- citava `aguardando_confirmacao_comprador` na regra do comprador — mas
-- nenhuma transição de código ou de RLS jamais levava a disputa para lá.
-- `marcarResolvidaPelaLoja` ia direto para `resolvida_pela_loja` sem
-- confirmação do comprador, e `escalarParaAdmin` bloqueava explicitamente o
-- escalonamento quando o status já era `resolvida_pela_loja` — ou seja, se a
-- loja marcava resolvida e o comprador discordava, não havia nenhum caminho
-- de código para ele escalar. Esta migration corrige o desenho:
--
--   loja:      aberta/em_atendimento_loja -> em_atendimento_loja (responde)
--                                          -> aguardando_confirmacao_comprador (propõe)
--   comprador: aguardando_confirmacao_comprador -> resolvida_pela_loja (confirma)
--                                                -> em_mediacao_admin (recusa/escala,
--                                                   sem trava de tempo — o prazo de
--                                                   3 dias do PRD é só um lembrete de
--                                                   UI, não um gate no banco)
--              aberta/em_atendimento_loja -> em_mediacao_admin (SLA 48h vencido, já existia)
--
-- Também adiciona a tabela de mediação com canal separado por lado
-- (decisão de produto do brainstorm: admin fala com comprador e com loja
-- sem que um veja a mensagem do outro) — distinta de `conversas`/`mensagens`
-- porque aquele schema amarra comprador+loja na mesma linha por design
-- (eh_participante_conversa() sempre libera os dois); não dá para reaproveitar
-- sem vazar a mediação para o outro lado.

alter table public.disputas
  add column if not exists proposta_resolucao_em timestamptz;

create or replace function public.guard_campos_restritos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

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

      if new.status is distinct from old.status then
        if exists (
          select 1 from public.lojas l where l.id = old.loja_id and l.owner_id = auth.uid()
        ) then
          -- 0115: loja não fecha mais direto — só responde ou propõe
          -- resolução, que passa pela confirmação do comprador.
          if not (
            old.status in ('aberta', 'em_atendimento_loja')
            and new.status in ('em_atendimento_loja', 'aguardando_confirmacao_comprador')
          ) then
            raise exception 'Transição de status da disputa não permitida para a loja.';
          end if;
        elsif old.comprador_id = auth.uid() then
          -- 0115: comprador escala por SLA vencido (como antes), OU — a
          -- partir de uma proposta da loja — confirma (fecha) ou recusa
          -- (escala), sem trava de tempo nesses dois últimos.
          if not (
            (
              new.status = 'em_mediacao_admin'
              and old.status in ('aberta', 'em_atendimento_loja')
              and now() >= old.sla_loja_vence_em
            )
            or (
              old.status = 'aguardando_confirmacao_comprador'
              and new.status in ('resolvida_pela_loja', 'em_mediacao_admin')
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

-- ============ Canal de mediação separado por lado ============
create table if not exists public.disputa_mensagens_mediacao (
  id           uuid primary key default gen_random_uuid(),
  disputa_id   uuid not null references public.disputas (id) on delete cascade,
  destinatario text not null check (destinatario in ('comprador', 'loja')),
  autor_id     uuid not null references auth.users (id) on delete cascade,
  corpo        text not null check (length(btrim(corpo)) between 1 and 4000),
  created_at   timestamptz not null default now()
);

create index if not exists disputa_mensagens_mediacao_disputa_idx
  on public.disputa_mensagens_mediacao (disputa_id, destinatario, created_at);

alter table public.disputa_mensagens_mediacao enable row level security;

-- Comprador só vê/envia no canal marcado 'comprador' da própria disputa;
-- loja só no canal 'loja' da disputa da própria loja; admin vê e escreve
-- nos dois. Nenhuma policy cruza os canais.
create policy disputa_mediacao_comprador_read on public.disputa_mensagens_mediacao for select
  using (
    destinatario = 'comprador'
    and exists (select 1 from public.disputas d where d.id = disputa_id and d.comprador_id = auth.uid())
  );
create policy disputa_mediacao_comprador_insert on public.disputa_mensagens_mediacao for insert
  with check (
    destinatario = 'comprador'
    and autor_id = auth.uid()
    and exists (select 1 from public.disputas d where d.id = disputa_id and d.comprador_id = auth.uid())
  );
create policy disputa_mediacao_seller_read on public.disputa_mensagens_mediacao for select
  using (
    destinatario = 'loja'
    and exists (
      select 1 from public.disputas d
      join public.lojas l on l.id = d.loja_id
      where d.id = disputa_id and l.owner_id = auth.uid()
    )
  );
create policy disputa_mediacao_seller_insert on public.disputa_mensagens_mediacao for insert
  with check (
    destinatario = 'loja'
    and autor_id = auth.uid()
    and exists (
      select 1 from public.disputas d
      join public.lojas l on l.id = d.loja_id
      where d.id = disputa_id and l.owner_id = auth.uid()
    )
  );
create policy disputa_mediacao_admin_all on public.disputa_mensagens_mediacao for all
  using (public.is_admin()) with check (public.is_admin());
