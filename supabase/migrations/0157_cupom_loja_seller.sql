-- 0157: cupom de loja (custeio pelo seller), fast-follow de 0156
-- (add-cupom-desconto-checkout, PR #497) — spec add-cupom-loja-seller.
--
-- Cupom de dono='loja': custeia pela margem do PRÓPRIO PRODUTO, não pela
-- plataforma. O preço final do item (min(preco_faixa, preco_com_cupom))
-- SUBSTITUI linha_itens.valor — o mesmo mecanismo que já existe para
-- desconto progressivo (preco_faixa). repasse_ind/repasse_afiliado nascem
-- sobre esse valor menor, como sempre nasceram. Sem piso: é decisão de preço
-- do seller. Zero mudança em repasse_vendedor/repasses_recalcular_pedido —
-- decisão explícita do dono, registrada em design.md.
--
-- Cupom de plataforma (dono='plataforma', 0156) não muda: valor continua
-- cheio, desconto em desconto_cupom, piso em repasse_ind.

-- ---------------------------------------------------------------------------
-- 1. Schema: afrouxa dono, valida alvo de regra por dono
-- ---------------------------------------------------------------------------

alter table public.cupons
  drop constraint cupons_dono_check,
  add constraint cupons_dono_check check (dono in ('plataforma', 'loja')),
  add constraint cupons_loja_exige_loja_id check (dono <> 'loja' or loja_id is not null);

-- alvo de regra de cupom de loja fica restrito a produto/loja (pedido do
-- dono: "cupom por produto... e cupom para a loja inteira" — categoria e
-- tudo não fazem sentido escopados a uma única loja). Não dá pra expressar
-- isso num CHECK simples em cupom_regras (precisa olhar cupons.dono de outra
-- tabela), daí o trigger.
create or replace function public.cupom_regra_valida_alvo()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_dono text;
begin
  select dono into v_dono from public.cupons where id = new.cupom_id;
  if v_dono = 'loja' and new.alvo not in ('produto', 'loja') then
    raise exception 'Cupom de loja só aceita regra de alvo produto ou loja.';
  end if;
  return new;
end;
$$;

create trigger cupom_regras_valida_alvo
  before insert or update on public.cupom_regras
  for each row execute function public.cupom_regra_valida_alvo();

-- ---------------------------------------------------------------------------
-- 2. RLS: seller gerencia cupons/regras da própria loja; lê os próprios usos
-- ---------------------------------------------------------------------------

create policy cupons_seller_manage on public.cupons
  for all
  using (
    dono = 'loja'
    and exists (select 1 from public.lojas l where l.id = cupons.loja_id and l.owner_id = auth.uid())
  )
  with check (
    dono = 'loja'
    and exists (select 1 from public.lojas l where l.id = cupons.loja_id and l.owner_id = auth.uid())
  );

create policy cupom_regras_seller_manage on public.cupom_regras
  for all
  using (
    exists (
      select 1 from public.cupons c join public.lojas l on l.id = c.loja_id
      where c.id = cupom_regras.cupom_id and c.dono = 'loja' and l.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cupons c join public.lojas l on l.id = c.loja_id
      where c.id = cupom_regras.cupom_id and c.dono = 'loja' and l.owner_id = auth.uid()
    )
  );

create policy cupom_usos_seller_read on public.cupom_usos
  for select
  using (
    exists (
      select 1 from public.cupons c join public.lojas l on l.id = c.loja_id
      where c.id = cupom_usos.cupom_id and c.dono = 'loja' and l.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Função de preço compartilhada (réplica de
--    src/lib/cupom-desconto.ts::precoUnitarioComCupomLoja /
--    regraAplicavel+precoComCupom). cupom_desconto_item (0156) passa a usá-la
--    por dentro, comportamento idêntico ao de antes (mesmos testes SQL já
--    exercitados na 0156 continuam válidos).
-- ---------------------------------------------------------------------------

create or replace function public.cupom_preco_item(
  p_regras       jsonb,
  p_produto_id   uuid,
  p_categoria_id uuid,
  p_loja_id      uuid,
  p_preco_base   numeric,
  p_preco_faixa  numeric
) returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare
  v_regra jsonb;
  v_alvo  text;
  v_preco_cupom numeric;
begin
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
    return p_preco_faixa;
  end if;

  if v_regra->>'tipo' = 'percentual' then
    v_preco_cupom := p_preco_base * (1 - (v_regra->>'valor')::numeric / 100);
  else
    v_preco_cupom := p_preco_base - (v_regra->>'valor')::numeric;
  end if;
  v_preco_cupom := round(greatest(0, v_preco_cupom), 2);

  return least(p_preco_faixa, v_preco_cupom);
end;
$$;

create or replace function public.cupom_desconto_item(
  p_regras       jsonb,
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
  v_preco_final numeric;
begin
  if p_repasse_ind is null or p_repasse_ind <= 0 then
    return 0;
  end if;
  v_preco_final := public.cupom_preco_item(
    p_regras, p_produto_id, p_categoria_id, p_loja_id, p_preco_base, p_preco_faixa);
  return least(round(greatest(0, p_preco_faixa - v_preco_final) * p_qtd, 2), p_repasse_ind);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. cupom_validar: preview também cobre cupom de loja (preço final, sem
--    piso, só para itens da loja dona do cupom).
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
  v_preco_final numeric;
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

    if v_cupom.dono = 'loja' then
      if v_cupom.loja_id = v_prod.loja_id then
        v_preco_final := public.cupom_preco_item(
          v_regras, v_prod.id, v_prod.categoria_id, v_prod.loja_id, v_prod.valor, v_preco_faixa);
        v_desc := round(greatest(0, v_preco_faixa - v_preco_final) * v_qtd, 2);
      else
        v_desc := 0;
      end if;
    else
      v_desc := public.cupom_desconto_item(
        v_regras, v_prod.id, v_prod.categoria_id, v_prod.loja_id,
        v_prod.valor, v_preco_faixa, v_qtd, v_repasse_ind);
    end if;
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

-- ---------------------------------------------------------------------------
-- 5. checkout_criar_pedido: cupom de loja substitui o preço da linha ANTES
--    de calcular valor/repasse_ind/repasse_afiliado (mesmo lugar onde
--    preco_faixa já é aplicado). Cupom de plataforma (0156) não muda.
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
  v_preco_final numeric(12,2);
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
      select count(distinct checkout_ref) into v_usos_cliente
      from public.cupom_usos
      where cupom_id = v_cupom.id and user_id = v_user and checkout_ref <> v_checkout_ref;

      if v_usos_cliente < v_cupom.limite_por_cliente then
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
            delete from public.cupom_usos
            where cupom_id = v_cupom.id and checkout_ref = v_checkout_ref;
            v_uso_novo := false;
          else
            v_cupom_id := v_cupom.id;
          end if;
        else
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

    v_desc_item := 0;

    -- Cupom de loja: substitui o preço unitário ANTES de calcular valor/
    -- repasses — mesmo mecanismo do desconto progressivo. Só para venda
    -- normal (sem venda futura) e só se a loja do cupom bate com a do pedido.
    if v_cupom_id is not null and v_cupom.dono = 'loja' and v_cupom.loja_id = v_loja and v_vf_id is null then
      v_preco_final := public.cupom_preco_item(
        v_cupom_regras, v_prod.id, v_prod.categoria_id, v_loja, v_prod.valor, v_preco_unit);
      v_desc_item := round(greatest(0, v_preco_unit - v_preco_final) * v_qtd, 2);
      v_preco_unit := v_preco_final;
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

    -- Cupom de plataforma: NÃO mexe em v_preco_unit/v_valor_item; abatimento
    -- à parte, limitado ao repasse_ind desta linha (0156, inalterado).
    if v_cupom_id is not null and v_cupom.dono = 'plataforma' and v_vf_id is null then
      v_desc_item := public.cupom_desconto_item(
        v_cupom_regras, v_prod.id, v_prod.categoria_id, v_loja,
        v_prod.valor, v_preco_unit, v_qtd, v_repasse_ind);
    end if;
    if v_desc_item > 0 then
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
      case when v_desc_item > 0 then v_cupom_id else null end,
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

  -- valor_pedido líquido: soma real das linhas (já refletindo cupom de loja
  -- no preço) + frete, menos o desconto de cupom de plataforma (que não
  -- mexeu no valor da linha). v_total_itens é pré-cupom; v_desc_total soma
  -- os dois tipos de desconto — a subtração fecha certo nos dois casos.
  update pedidos set valor_pedido = v_total_itens + v_frete - v_desc_total
  where id = v_pedido;

  if v_cupom_id is not null and v_desc_total = 0 then
    perform public.cupom_liberar_uso_pedido(v_pedido);
  end if;

  return v_pedido;
end;
$$;

revoke all on function public.checkout_criar_pedido(jsonb, jsonb, text) from public;
grant execute on function public.checkout_criar_pedido(jsonb, jsonb, text) to authenticated;
