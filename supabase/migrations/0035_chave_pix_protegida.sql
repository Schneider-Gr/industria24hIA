-- 0035: chave_pix/tipo_chave_pix da loja não estavam no guard_campos_restritos
-- (0012/0031) — o seller trocava a chave PIX a qualquer momento pelo mesmo
-- UPDATE genérico de salvarLoja, sem validação de formato, sem confirmação
-- extra, sem log. Achado da avaliação de segurança do repasse
-- (docs/e5-seller-onboarding-b2b-auditoria.md, seção 2). Esta migration:
-- (1) bloqueia a troca pelo caminho genérico; (2) cria RPC dedicada com
-- validação de formato + log em auditoria_eventos; (3) adiciona um selo de
-- "confirmada" com carência, para uso futuro pelo processo de repasse
-- automático (e4-split-repasse-bpmn.md) — chave alterada só fica elegível
-- para repasse depois de confirmada; lojas já existentes são grandfathered
-- (chave atual marcada como confirmada na hora desta migration, só MUDANÇAS
-- daqui em diante entram em carência).

-- Re-declara registrar_auditoria_generico ANTES de tocar em lojas: a versão
-- da 0034 originalmente aplicada em prod acessava new.status_produto num
-- "and" mesmo quando tg_table_name='lojas' (Postgres não garante
-- short-circuit), quebrando qualquer UPDATE em lojas — inclusive o
-- grandfather abaixo. Mesmo corpo do arquivo 0034 corrigido.
create or replace function public.registrar_auditoria_generico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ator_papel text := case when auth.uid() is null then 'service_role' else 'authenticated' end;
begin
  if tg_table_name = 'lojas' then
    if new.situacao is distinct from old.situacao then
      insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_antes, dados_depois)
      values (auth.uid(), v_ator_papel, 'loja.situacao_alterada', 'lojas', new.id,
              jsonb_build_object('situacao', old.situacao),
              jsonb_build_object('situacao', new.situacao));
    end if;

  elsif tg_table_name = 'produtos' then
    if new.status_produto is distinct from old.status_produto then
      insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_antes, dados_depois)
      values (auth.uid(), v_ator_papel, 'produto.status_alterado', 'produtos', new.id,
              jsonb_build_object('status_produto', old.status_produto),
              jsonb_build_object('status_produto', new.status_produto));
    end if;

  elsif tg_table_name = 'linha_itens' then
    if new.transferido is distinct from old.transferido then
      insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_antes, dados_depois)
      values (auth.uid(), v_ator_papel, 'linha_item.transferido_alterado', 'linha_itens', new.id,
              jsonb_build_object('transferido', old.transferido),
              jsonb_build_object('transferido', new.transferido, 'pedido_id', new.pedido_id));
    end if;
  end if;

  return new;
end;
$$;

alter table public.lojas
  add column if not exists chave_pix_confirmada_em timestamptz;

-- Grandfather: quem já tem chave_pix hoje, já operava — não travar retroativo.
update public.lojas
  set chave_pix_confirmada_em = now()
  where chave_pix is not null and chave_pix_confirmada_em is null;

-- ============ 1. Bloquear troca pelo caminho genérico ============
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
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- ============ 2. RPC dedicada de troca (valida formato + audita) ============
create or replace function public.alterar_chave_pix_loja(
  p_loja_id uuid,
  p_chave_pix text,
  p_tipo_chave_pix text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes record;
  v_digitos text;
begin
  if auth.uid() is null then
    raise exception 'Faça login para alterar a chave PIX.';
  end if;
  if p_tipo_chave_pix not in ('CNPJ', 'CPF', 'EMAIL', 'PHONE') then
    raise exception 'Tipo de chave PIX inválido.';
  end if;
  if p_chave_pix is null or length(trim(p_chave_pix)) = 0 then
    raise exception 'Chave PIX não pode ser vazia.';
  end if;

  -- Validação de formato (não substitui consulta DICT de titularidade —
  -- ver e5-seller-onboarding-b2b-auditoria.md seção 2, ainda não implementada).
  v_digitos := regexp_replace(p_chave_pix, '\D', '', 'g');
  if p_tipo_chave_pix = 'CPF' and length(v_digitos) <> 11 then
    raise exception 'CPF inválido: deve ter 11 dígitos.';
  elsif p_tipo_chave_pix = 'CNPJ' and length(v_digitos) <> 14 then
    raise exception 'CNPJ inválido: deve ter 14 dígitos.';
  elsif p_tipo_chave_pix = 'EMAIL' and p_chave_pix !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'E-mail inválido.';
  elsif p_tipo_chave_pix = 'PHONE' and length(v_digitos) not between 10 and 13 then
    raise exception 'Telefone inválido.';
  end if;

  select chave_pix, tipo_chave_pix into v_antes
  from lojas where id = p_loja_id and owner_id = auth.uid();
  if not found then
    raise exception 'Loja não encontrada ou sem permissão para editar.';
  end if;

  perform set_config('app.chave_pix_rpc', 'on', true);
  update lojas
    set chave_pix = p_chave_pix,
        tipo_chave_pix = p_tipo_chave_pix,
        chave_pix_confirmada_em = null  -- reinicia carência a cada troca
    where id = p_loja_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_antes, dados_depois)
  values (auth.uid(), 'seller', 'chave_pix.alterada', 'lojas', p_loja_id,
          jsonb_build_object('chave_pix', v_antes.chave_pix, 'tipo_chave_pix', v_antes.tipo_chave_pix),
          jsonb_build_object('chave_pix', p_chave_pix, 'tipo_chave_pix', p_tipo_chave_pix));
end;
$$;

revoke all on function public.alterar_chave_pix_loja(uuid, text, text) from public;
grant execute on function public.alterar_chave_pix_loja(uuid, text, text) to authenticated;

-- ============ 3. Elegibilidade para repasse automático (carência) ============
-- Usado pelo Processo 2 de e4-split-repasse-bpmn.md quando a transferência
-- automática for implementada: chave recém-trocada cai no fallback humano
-- em vez de repassar automaticamente, até alguém confirmar (admin, ou
-- futura confirmação por e-mail/DICT — nenhum dos dois existe ainda).
create or replace function public.chave_pix_elegivel_repasse(p_loja_id uuid)
returns boolean
language sql
stable
as $$
  select chave_pix is not null
     and chave_pix_confirmada_em is not null
     and chave_pix_confirmada_em <= now() - interval '24 hours'
  from lojas where id = p_loja_id;
$$;

create or replace function public.confirmar_chave_pix(p_loja_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (auth.uid() is null or public.is_admin()) then
    raise exception 'Apenas admin ou service_role confirmam chave PIX.';
  end if;
  update lojas set chave_pix_confirmada_em = now() where id = p_loja_id;
end;
$$;

revoke all on function public.confirmar_chave_pix(uuid) from public;
grant execute on function public.confirmar_chave_pix(uuid) to authenticated;
