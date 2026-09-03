-- 0155: cupom de desconto no checkout (issue #491, spec OpenSpec
-- add-cupom-desconto-checkout).
--
-- MVP: só cupom de plataforma (admin). Custeio 100% pela margem da plataforma
-- (linha_itens.repasse_ind, 5% do valor cheio):
--
--   * linha_itens.valor continua sendo o preço cheio (preco_faixa * qtd) — os
--     repasses (repasse_ind, repasse_afiliado) são calculados como sem cupom,
--     então afiliado e resíduo do seller ficam intocados;
--   * o abatimento vive em linha_itens.desconto_cupom (+ cupom_id) e só reduz
--     pedidos.valor_pedido (o que o comprador paga / base da cobrança Asaas);
--   * repasses_recalcular_pedido (0111) e calcular_repasses_pedido (0084) NÃO
--     são tocadas — repasse_ind é margem retida, não gera transferência.
--
-- O cupom entra no checkout via entrega->>'cupom_codigo' (+ 'checkout_ref'),
-- mesmo padrão de transportadora_id/cotacao_externa_id (0107/0140/0150) — não
-- altera a assinatura da RPC nem a cadeia de overloads.
--
-- Fase 2 (fora daqui): cupom criado/custeado pelo seller — depende de corrigir
-- linha_itens.repasse_vendedor, que hoje nenhuma migration nem o app escrevem.

-- ---------------------------------------------------------------------------
-- 1. Schema
-- ---------------------------------------------------------------------------

create table public.cupons (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null,
  dono                text not null default 'plataforma'
                        check (dono in ('plataforma')),  -- fase 2 afrouxa p/ 'loja'
  loja_id             uuid references public.lojas(id),
  validade_inicio     timestamptz not null,
  validade_fim        timestamptz not null,
  valor_minimo_pedido numeric(12,2) check (valor_minimo_pedido is null or valor_minimo_pedido >= 0),
  limite_global       integer check (limite_global is null or limite_global > 0),
  limite_por_cliente  integer not null default 1 check (limite_por_cliente > 0),
  usos                integer not null default 0 check (usos >= 0),
  ativo               boolean not null default true,
  criado_por          uuid references auth.users(id),
  criado_em           timestamptz not null default now(),
  check (validade_fim > validade_inicio),
  check (dono <> 'plataforma' or loja_id is null)
);

create unique index cupons_codigo_uniq on public.cupons (lower(codigo));

create table public.cupom_regras (
  id        uuid primary key default gen_random_uuid(),
  cupom_id  uuid not null references public.cupons(id) on delete cascade,
  alvo      text not null check (alvo in ('produto', 'categoria', 'loja', 'tudo')),
  alvo_id   uuid,
  tipo      text not null check (tipo in ('percentual', 'valor_fixo')),
  valor     numeric(12,2) not null check (valor > 0),
  check (tipo <> 'percentual' or valor <= 100),
  check (alvo = 'tudo' or alvo_id is not null)
);

create index cupom_regras_cupom_id on public.cupom_regras (cupom_id);

create table public.cupom_usos (
  id           uuid primary key default gen_random_uuid(),
  cupom_id     uuid not null references public.cupons(id) on delete cascade,
  user_id      uuid not null references auth.users(id),
  checkout_ref text not null,
  pedido_id    uuid references public.pedidos(id),
  criado_em    timestamptz not null default now(),
  unique (cupom_id, checkout_ref)
);

create index cupom_usos_cupom_user on public.cupom_usos (cupom_id, user_id);
create index cupom_usos_pedido on public.cupom_usos (pedido_id);

alter table public.linha_itens
  add column if not exists cupom_id      uuid references public.cupons(id),
  add column if not exists desconto_cupom numeric(12,2)
    check (desconto_cupom is null or desconto_cupom >= 0);

-- ---------------------------------------------------------------------------
-- 2. RLS — só admin gerencia; comprador não acessa nada
-- ---------------------------------------------------------------------------

alter table public.cupons       enable row level security;
alter table public.cupom_regras enable row level security;
alter table public.cupom_usos   enable row level security;

create policy cupons_admin_all on public.cupons
  for all using (public.is_admin()) with check (public.is_admin());

create policy cupom_regras_admin_all on public.cupom_regras
  for all using (public.is_admin()) with check (public.is_admin());

create policy cupom_usos_admin_read on public.cupom_usos
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Guard financeiro: desconto_cupom / cupom_id da linha só mudam por admin
--    ou pela RPC de checkout (app.checkout_rpc). O bypass de app.checkout_rpc
--    em guard_campos_restritos (0109) já cobre o INSERT da RPC; aqui só se
--    acrescenta o par ao branch de UPDATE de linha_itens.
-- ---------------------------------------------------------------------------

create or replace function public.guard_campos_restritos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if coalesce(current_setting('app.checkout_rpc', true), '') = 'on' then
    if tg_op = 'DELETE' then return old; end if;
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
      or new.desconto_cupom is distinct from old.desconto_cupom
      or new.cupom_id is distinct from old.cupom_id
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

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Núcleo do desconto — réplica autoritativa de src/lib/cupom-desconto.ts
--    (aplicarCupom). Se mudar aqui, mude lá. Checks em cupom-desconto.test.ts.
-- ---------------------------------------------------------------------------

-- Regra aplicável = alvo mais específico (produto > categoria > loja > tudo).
-- Desconto por unidade = max(0, preco_faixa - preco_com_cupom), onde
-- preco_com_cupom é a regra aplicada sobre o preço BASE. Desconto da linha
-- limitado ao repasse_ind da linha (piso da margem da plataforma).
create or replace function public.cupom_desconto_item(
  p_regras       jsonb,   -- [{alvo,alvo_id,tipo,valor}]
  p_produto_id   uuid,
  p_categoria_id uuid,
  p_loja_id      uuid,
  p_preco_base   numeric,
  p_preco_faixa  numeric,
  p_qtd          integer,
  p_repasse_ind  numeric
) returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare
  v_regra jsonb;
  v_alvo  text;
  v_preco_cupom numeric;
  v_desc_unit numeric;
  v_desc_linha numeric;
begin
  if p_repasse_ind is null or p_repasse_ind <= 0 then
    return 0;
  end if;

  for v_alvo in select unnest(array['produto', 'categoria', 'loja', 'tudo']) loop
    select r into v_regra
    from jsonb_array_elements(p_regras) r
    where r->>'alvo' = v_alvo
      and (
        (v_alvo = 'produto'   and (r->>'alvo_id')::uuid = p_produto_id) or
        (v_alvo = 'categoria' and p_categoria_id is not null and (r->>'alvo_id')::uuid = p_categoria_id) or
        (v_alvo = 'loja'      and (r->>'alvo_id')::uuid = p_loja_id) or
        (v_alvo = 'tudo')
      )
    limit 1;
    exit when v_regra is not null;
  end loop;

  if v_regra is null then
    return 0;
  end if;

  if v_regra->>'tipo' = 'percentual' then
    v_preco_cupom := p_preco_base * (1 - (v_regra->>'valor')::numeric / 100);
  else
    v_preco_cupom := p_preco_base - (v_regra->>'valor')::numeric;
  end if;
  v_preco_cupom := greatest(0, v_preco_cupom);

  v_desc_unit := greatest(0, p_preco_faixa - v_preco_cupom);
  v_desc_linha := round(v_desc_unit * p_qtd, 2);
  return least(v_desc_linha, p_repasse_ind);
end;
$$;

-- Wrapper por código: resolve o cupom, carrega as regras e mapeia sobre os
-- itens. Usado pelo preview (cupom_validar). O checkout_criar_pedido chama
-- cupom_desconto_item direto no loop de linhas (já tem repasse_ind por linha).
-- p_itens: [{produto_id, categoria_id, loja_id, preco_base, preco_faixa, quantidade, repasse_ind}]
create or replace function public.cupom_aplicar(p_codigo text, p_itens jsonb)
returns table (produto_id uuid, desconto numeric)
language plpgsql
stable
set search_path = public
as $$
declare
  v_cupom  public.cupons;
  v_regras jsonb;
begin
  select * into v_cupom from public.cupons where lower(codigo) = lower(p_codigo);
  if not found or not v_cupom.ativo
     or now() < v_cupom.validade_inicio or now() > v_cupom.validade_fim then
    return;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'alvo', alvo, 'alvo_id', alvo_id, 'tipo', tipo, 'valor', valor)), '[]'::jsonb)
    into v_regras
  from public.cupom_regras where cupom_id = v_cupom.id;

  return query
  select (i->>'produto_id')::uuid,
         public.cupom_desconto_item(
           v_regras,
           (i->>'produto_id')::uuid,
           nullif(i->>'categoria_id', '')::uuid,
           (i->>'loja_id')::uuid,
           (i->>'preco_base')::numeric,
           (i->>'preco_faixa')::numeric,
           (i->>'quantidade')::integer,
           (i->>'repasse_ind')::numeric)
  from jsonb_array_elements(p_itens) i;
end;
$$;

revoke all on function public.cupom_aplicar(text, jsonb) from public, anon;
grant execute on function public.cupom_aplicar(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Preview no checkout — não cria pedido. Recebe os itens já com preço de
--    faixa e repasse_ind calculados pelo client-preview? Não: o client manda
--    só {produto_id, quantidade}; a função resolve preço/faixa/repasse do
--    banco (mesma fonte da RPC), então o preview não pode ser adulterado.
-- ---------------------------------------------------------------------------
create or replace function public.cupom_validar(p_codigo text, p_itens jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cupom public.cupons;
  v_regras jsonb;
  v_item jsonb;
  v_prod record;
  v_qtd integer;
  v_preco_faixa numeric;
  v_valor_item numeric;
  v_repasse_ind numeric;
  v_total_merc numeric := 0;
  v_desc_total numeric := 0;
  v_usos_cliente integer;
  v_linhas jsonb := '[]'::jsonb;
  v_desc numeric;
begin
  if v_user is null then
    return jsonb_build_object('valido', false, 'motivo', 'Faça login.');
  end if;

  select * into v_cupom from public.cupons where lower(codigo) = lower(p_codigo);
  if not found or not v_cupom.ativo then
    return jsonb_build_object('valido', false, 'motivo', 'Cupom inválido.');
  end if;
  if now() < v_cupom.validade_inicio or now() > v_cupom.validade_fim then
    return jsonb_build_object('valido', false, 'motivo', 'Cupom fora da validade.');
  end if;
  if v_cupom.limite_global is not null and v_cupom.usos >= v_cupom.limite_global then
    return jsonb_build_object('valido', false, 'motivo', 'Cupom esgotado.');
  end if;

  select count(distinct checkout_ref) into v_usos_cliente
  from public.cupom_usos where cupom_id = v_cupom.id and user_id = v_user;
  if v_usos_cliente >= v_cupom.limite_por_cliente then
    return jsonb_build_object('valido', false, 'motivo', 'Você já usou este cupom.');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'alvo', alvo, 'alvo_id', alvo_id, 'tipo', tipo, 'valor', valor)), '[]'::jsonb)
    into v_regras
  from public.cupom_regras where cupom_id = v_cupom.id;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := (v_item->>'quantidade')::integer;
    select p.id, p.loja_id, p.categoria_id, p.valor into v_prod
    from public.produtos p where p.id = (v_item->>'produto_id')::uuid;
    if not found or v_qtd is null or v_qtd < 1 then
      continue;
    end if;
    v_preco_faixa := public.preco_faixa(v_prod.id, v_qtd, v_prod.valor);
    v_valor_item := v_preco_faixa * v_qtd;
    v_repasse_ind := round(v_valor_item * 0.05, 2);
    v_total_merc := v_total_merc + v_valor_item;

    v_desc := public.cupom_desconto_item(
      v_regras, v_prod.id, v_prod.categoria_id, v_prod.loja_id,
      v_prod.valor, v_preco_faixa, v_qtd, v_repasse_ind);
    v_desc_total := v_desc_total + v_desc;
    v_linhas := v_linhas || jsonb_build_object('produto_id', v_prod.id, 'desconto', v_desc);
  end loop;

  if v_cupom.valor_minimo_pedido is not null and v_total_merc < v_cupom.valor_minimo_pedido then
    return jsonb_build_object('valido', false,
      'motivo', format('Pedido mínimo de R$ %s para este cupom.', v_cupom.valor_minimo_pedido));
  end if;

  return jsonb_build_object(
    'valido', true,
    'cupom_id', v_cupom.id,
    'desconto_total', v_desc_total,
    'linhas', v_linhas);
end;
$$;

revoke all on function public.cupom_validar(text, jsonb) from public, anon;
grant execute on function public.cupom_validar(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Liberação de uso em cancelamento pré-pagamento (D9). Chamada pelos dois
--    caminhos de cancelamento que existem: pedido_cancelar_devolver_estoque
--    (webhook Asaas, só 'Aguardando Pagamento') e pedido_cancelar (admin/
--    seller — só libera se ainda não pago).
--    ponytail: num checkout multiloja, cupom_usos guarda 1 linha por
--    (cupom_id, checkout_ref), com pedido_id do 1º pedido criado. Cancelar
--    só esse 1º pedido libera o uso enquanto os outros pedidos do mesmo
--    checkout ainda carregam o desconto — canto aceito no MVP (multiloja +
--    cupom + cancelamento parcial é raro). Fase 2: checkout_ref em `pedidos`.
-- ---------------------------------------------------------------------------
create or replace function public.cupom_liberar_uso_pedido(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cupom_id uuid;
begin
  delete from public.cupom_usos where pedido_id = p_pedido_id returning cupom_id into v_cupom_id;
  if v_cupom_id is not null then
    update public.cupons set usos = greatest(0, usos - 1) where id = v_cupom_id;
  end if;
end;
$$;

revoke all on function public.cupom_liberar_uso_pedido(uuid) from public, anon, authenticated;

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
  perform public.cupom_liberar_uso_pedido(p_pedido_id);

  update pedidos set status_pedido = 'Cancelado' where id = p_pedido_id;
end;
$$;

revoke all on function public.pedido_cancelar_devolver_estoque(uuid) from public;
grant execute on function public.pedido_cancelar_devolver_estoque(uuid) to service_role;

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

revoke all on function public.pedido_cancelar(uuid, text) from public, anon;
grant execute on function public.pedido_cancelar(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. checkout_criar_pedido (base 3 args) — lê o cupom de `entrega`, aplica o
--    desconto por linha, grava desconto_cupom/cupom_id e valor_pedido líquido.
--    Só o BODY da base muda; a cadeia 4/5/6 args (0065/0074/0107/0119) segue
--    delegando `entrega` intacto (mesmo racional de 0140/0150).
-- ---------------------------------------------------------------------------

create or replace function public.checkout_criar_pedido(
  itens jsonb,
  entrega jsonb,
  forma_pagamento text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_pedido uuid;
  v_loja uuid;
  v_item jsonb;
  v_prod record;
  v_vf record;
  v_vf_id uuid;
  v_qtd int;
  v_preco_unit numeric(12,2);
  v_valor_item numeric(12,2);
  v_total_itens numeric(12,2) := 0;
  v_frete numeric(12,2) := 0;
  v_percentual numeric(5,2);
  v_cep int;
  v_retirada boolean;
  v_afil record;
  v_minimo numeric(12,2);
  v_permite_retirada boolean;
  v_tem_venda_futura boolean := false;
  v_transportadora uuid;
  v_transp_fonte text;
  v_cotacao_externa_id uuid;
  v_cotacao_externa record;
  v_n_itens int;
  v_i int := 0;
  v_frete_linha numeric(12,2);
  v_frete_rateado numeric(12,2) := 0;
  -- cupom
  v_cupom_codigo text;
  v_checkout_ref text;
  v_cupom public.cupons;
  v_cupom_regras jsonb := '[]'::jsonb;
  v_cupom_id uuid;
  v_repasse_ind numeric(12,2);
  v_desc_item numeric(12,2);
  v_desc_total numeric(12,2) := 0;
  v_usos_cliente int;
  v_uso_novo boolean := false;
  v_claim int;
begin
  if v_user is null then
    raise exception 'Faça login para finalizar a compra.';
  end if;
  if jsonb_array_length(itens) = 0 then
    raise exception 'Carrinho vazio.';
  end if;
  if forma_pagamento not in ('PIX', 'BOLETO', 'CREDIT_CARD') then
    raise exception 'Forma de pagamento inválida.';
  end if;
  if (select count(distinct e->>'produto_id') from jsonb_array_elements(itens) e)
     <> jsonb_array_length(itens) then
    raise exception 'Produto duplicado no carrinho. Some a quantidade no mesmo item.';
  end if;

  select true into v_tem_venda_futura
  from jsonb_array_elements(itens) e
  where nullif(e->>'venda_futura_id', '') is not null
  limit 1;

  if v_tem_venda_futura then
    if not exists (
      select 1 from perfis_compradores
      where user_id = v_user
        and tipo_documento in ('CNPJ', 'IE')
        and documento is not null
        and length(trim(documento)) > 0
    ) then
      raise exception 'Compra no Mercado Futuro exige cadastro de CNPJ ou Inscrição Estadual de produtor rural. Complete seu perfil antes de continuar.';
    end if;
  end if;

  v_retirada := (entrega->>'tipo') = 'retirada';
  if not v_retirada then
    v_cep := nullif(regexp_replace(entrega->>'cep', '\D', '', 'g'), '')::int;
    v_transportadora := nullif(entrega->>'transportadora_id', '')::uuid;
    v_cotacao_externa_id := nullif(entrega->>'cotacao_externa_id', '')::uuid;
  end if;

  for v_item in select * from jsonb_array_elements(itens) loop
    v_qtd := (v_item->>'quantidade')::int;
    if v_qtd is null or v_qtd < 1 then
      raise exception 'Quantidade inválida.';
    end if;

    select p.id, p.loja_id, p.nome, p.valor, p.estoque_atual, p.quantidade_minima
      into v_prod
    from produtos p
    join lojas l on l.id = p.loja_id
    where p.id = (v_item->>'produto_id')::uuid
      and p.status_produto = 'Aprovado'
      and p.valor > 0
      and l.situacao = 'Ativa'
    for update of p;
    if not found then
      raise exception 'Produto indisponível: %', v_item->>'produto_id';
    end if;
    if v_loja is null then
      v_loja := v_prod.loja_id;
    elsif v_loja <> v_prod.loja_id then
      raise exception 'O carrinho deve conter itens de uma única loja.';
    end if;
    if v_prod.quantidade_minima is not null and v_qtd < v_prod.quantidade_minima then
      raise exception 'Quantidade mínima de "%" é %.', v_prod.nome, v_prod.quantidade_minima;
    end if;

    v_vf_id := nullif(v_item->>'venda_futura_id', '')::uuid;
    if v_vf_id is not null then
      select vf.id, vf.produto_id, vf.estoque, vf.valor into v_vf
      from vendas_futuras vf
      where vf.id = v_vf_id and vf.produto_id = v_prod.id;
      if not found then
        raise exception 'Venda futura indisponível: %', v_vf_id;
      end if;
      if v_qtd > v_vf.estoque then
        raise exception 'Estoque insuficiente na reserva de "%" (disponível: %).', v_prod.nome, v_vf.estoque;
      end if;
      v_preco_unit := coalesce(v_vf.valor, v_prod.valor);
    else
      if v_qtd > v_prod.estoque_atual then
        raise exception 'Estoque insuficiente de "%" (disponível: %).', v_prod.nome, v_prod.estoque_atual;
      end if;
      v_preco_unit := preco_faixa(v_prod.id, v_qtd, v_prod.valor);
    end if;

    v_total_itens := v_total_itens + (v_preco_unit * v_qtd);
  end loop;

  if not v_retirada and v_transportadora is not null then
    select fonte into v_transp_fonte
    from transportadoras
    where id = v_transportadora and ativo
      and (loja_id = v_loja or loja_id is null);
    if not found then
      raise exception 'Transportadora indisponível para esta loja.';
    end if;
    if v_transp_fonte = 'mercado_envios' then
      raise exception 'Cotação externa (Mercado Envios) ainda não disponível no checkout.';
    end if;
  end if;

  if not v_retirada and v_transp_fonte = 'uber_direct' then
    if v_cotacao_externa_id is null then
      raise exception 'Cotação de frete ausente. Atualize a página e tente novamente.';
    end if;
    select fee_centavos, expira_em into v_cotacao_externa
    from cotacoes_frete_externo
    where id = v_cotacao_externa_id and loja_id = v_loja;
    if not found or v_cotacao_externa.expira_em < now() then
      raise exception 'Cotação de frete expirada. Atualize a página e tente novamente.';
    end if;
    v_frete := round(v_cotacao_externa.fee_centavos / 100.0, 2);
  end if;

  if not v_retirada and v_transp_fonte = 'tabela_importada' then
    select valor into v_frete
    from cotar_frete_tabela(v_loja, v_cep, 0)
    limit 1;
    if not found then
      raise exception 'A tabela de frete desta transportadora não cobre o CEP informado. Escolha retirada na loja.';
    end if;
  end if;

  if not v_retirada and coalesce(v_transp_fonte, '') not in ('uber_direct', 'tabela_importada') then
    select percentual into v_percentual
    from faixas_cep
    where ativo and v_cep between cep_inicial and cep_final
      and (loja_id = v_loja or loja_id is null)
      and (transportadora_id is not distinct from v_transportadora)
    order by (loja_id = v_loja) desc, (cep_final - cep_inicial) asc
    limit 1;
    if v_percentual is null then
      raise exception 'Entrega indisponível para o CEP informado. Escolha retirada na loja.';
    end if;
  end if;

  select valor_pedido_minimo, permite_retirada_na_loja into v_minimo, v_permite_retirada
    from lojas where id = v_loja;
  if v_total_itens < coalesce(v_minimo, 0) then
    raise exception 'Pedido abaixo do valor mínimo da loja (R$ %).', v_minimo;
  end if;
  if v_retirada and not coalesce(v_permite_retirada, false) then
    raise exception 'Esta loja não permite retirada. Escolha entrega.';
  end if;

  if not v_retirada and coalesce(v_transp_fonte, '') not in ('uber_direct', 'tabela_importada') then
    v_frete := round(v_total_itens * v_percentual / 100, 2);
  end if;

  -- ---- Cupom: valida contra o banco; nunca aceita valor vindo do client ----
  v_cupom_codigo := nullif(entrega->>'cupom_codigo', '');
  v_checkout_ref := nullif(entrega->>'checkout_ref', '');
  if v_cupom_codigo is not null and v_checkout_ref is not null then
    select * into v_cupom from public.cupons where lower(codigo) = lower(v_cupom_codigo);
    if found and v_cupom.ativo
       and now() between v_cupom.validade_inicio and v_cupom.validade_fim
       and (v_cupom.valor_minimo_pedido is null or v_total_itens >= v_cupom.valor_minimo_pedido)
    then
      -- teto por cliente (conta checkout_ref distintos; retry do mesmo cai fora)
      select count(distinct checkout_ref) into v_usos_cliente
      from public.cupom_usos
      where cupom_id = v_cupom.id and user_id = v_user and checkout_ref <> v_checkout_ref;

      if v_usos_cliente < v_cupom.limite_por_cliente then
        -- claim atômico: 1 uso por checkout_ref
        insert into public.cupom_usos (cupom_id, user_id, checkout_ref)
        values (v_cupom.id, v_user, v_checkout_ref)
        on conflict (cupom_id, checkout_ref) do nothing;
        get diagnostics v_claim = row_count;
        v_uso_novo := v_claim > 0;

        if v_uso_novo then
          update public.cupons set usos = usos + 1
          where id = v_cupom.id
            and (limite_global is null or usos < limite_global);
          get diagnostics v_claim = row_count;
          if v_claim = 0 then
            -- teto global estourou entre o select e o update: desfaz o claim
            delete from public.cupom_usos
            where cupom_id = v_cupom.id and checkout_ref = v_checkout_ref;
            v_uso_novo := false;
          else
            v_cupom_id := v_cupom.id;
          end if;
        else
          -- retry do mesmo checkout: uso já contabilizado, aplica o desconto
          v_cupom_id := v_cupom.id;
        end if;

        if v_cupom_id is not null then
          select coalesce(jsonb_agg(jsonb_build_object(
                   'alvo', alvo, 'alvo_id', alvo_id, 'tipo', tipo, 'valor', valor)), '[]'::jsonb)
            into v_cupom_regras
          from public.cupom_regras where cupom_id = v_cupom_id;
        end if;
      end if;
    end if;
  end if;

  perform set_config('app.checkout_rpc', 'on', true);

  insert into pedidos (id_venda, loja_id, cliente_id, data, status_pedido,
                       valor_pedido, forma_pagamento)
  values (upper(substr(md5(random()::text), 1, 10)), v_loja, v_user, now(),
          'Aguardando Pagamento', 0, forma_pagamento)
  returning id into v_pedido;

  if v_cupom_id is not null then
    update public.cupom_usos set pedido_id = v_pedido
    where cupom_id = v_cupom_id and checkout_ref = v_checkout_ref and pedido_id is null;
  end if;

  v_n_itens := jsonb_array_length(itens);

  for v_item in select * from jsonb_array_elements(itens) loop
    v_i := v_i + 1;
    v_qtd := (v_item->>'quantidade')::int;
    select p.id, p.nome, p.valor, p.categoria_id, p.loja_id into v_prod
    from produtos p where p.id = (v_item->>'produto_id')::uuid;

    v_vf_id := nullif(v_item->>'venda_futura_id', '')::uuid;
    if v_vf_id is not null then
      select valor into v_preco_unit from vendas_futuras where id = v_vf_id;
      v_preco_unit := coalesce(v_preco_unit, v_prod.valor);
    else
      v_preco_unit := preco_faixa(v_prod.id, v_qtd, v_prod.valor);
    end if;
    v_valor_item := v_preco_unit * v_qtd;

    if v_retirada then
      v_frete_linha := null;
    elsif v_i = v_n_itens then
      v_frete_linha := v_frete - v_frete_rateado;
    elsif v_transp_fonte in ('uber_direct', 'tabela_importada') then
      v_frete_linha := round(v_frete * v_valor_item / nullif(v_total_itens, 0), 2);
      v_frete_rateado := v_frete_rateado + v_frete_linha;
    else
      v_frete_linha := round(v_valor_item * v_percentual / 100, 2);
      v_frete_rateado := v_frete_rateado + v_frete_linha;
    end if;

    select a.afiliado_id, a.porcentagem into v_afil
    from afiliacoes a
    where a.status = 'Aprovada'
      and (a.produto_id = v_prod.id or a.loja_id = v_loja)
    order by a.produto_id nulls last, a.created_at desc
    limit 1;

    v_repasse_ind := round(v_valor_item * 0.05, 2);

    -- cupom (só quando o cupom foi efetivamente reivindicado acima; venda
    -- futura não recebe desconto de cupom nesta entrega)
    v_desc_item := 0;
    if v_cupom_id is not null and v_vf_id is null then
      v_desc_item := public.cupom_desconto_item(
        v_cupom_regras, v_prod.id, v_prod.categoria_id, v_loja,
        v_prod.valor, v_preco_unit, v_qtd, v_repasse_ind);
      v_desc_total := v_desc_total + v_desc_item;
    end if;

    insert into linha_itens (pedido_id, produto_id, produto_nome, quantidade,
      valor, repasse_ind, repasse_afiliado, afiliado_id, venda_futura_id,
      retirar_na_loja, valor_frete, transportadora_id,
      cupom_id, desconto_cupom,
      entrega_cep, entrega_rua, entrega_numero, entrega_bairro,
      entrega_cidade, entrega_complemento)
    values (v_pedido, v_prod.id, v_prod.nome, v_qtd,
      v_valor_item,
      v_repasse_ind,
      case when v_afil.afiliado_id is null then 0
           else round(v_valor_item * v_afil.porcentagem / 100, 2) end,
      v_afil.afiliado_id,
      v_vf_id,
      v_retirada,
      v_frete_linha,
      case when v_retirada then null else v_transportadora end,
      case when v_cupom_id is not null and v_desc_item > 0 then v_cupom_id else null end,
      case when v_desc_item > 0 then v_desc_item else null end,
      case when v_retirada then null else entrega->>'cep' end,
      case when v_retirada then null else entrega->>'rua' end,
      case when v_retirada then null else entrega->>'numero' end,
      case when v_retirada then null else entrega->>'bairro' end,
      case when v_retirada then null else entrega->>'cidade' end,
      case when v_retirada then null else entrega->>'complemento' end);

    if v_vf_id is not null then
      update vendas_futuras set estoque = estoque - v_qtd where id = v_vf_id;
    else
      update produtos set estoque_atual = estoque_atual - v_qtd where id = v_prod.id;
    end if;
  end loop;

  -- valor_pedido líquido: mercadoria + frete - desconto de cupom
  update pedidos set valor_pedido = v_total_itens + v_frete - v_desc_total
  where id = v_pedido;

  -- cupom reivindicado mas nenhuma linha elegível (piso/alvo): devolve o uso
  if v_cupom_id is not null and v_desc_total = 0 then
    perform public.cupom_liberar_uso_pedido(v_pedido);
  end if;

  return v_pedido;
end;
$$;

revoke all on function public.checkout_criar_pedido(jsonb, jsonb, text) from public;
grant execute on function public.checkout_criar_pedido(jsonb, jsonb, text) to authenticated;
