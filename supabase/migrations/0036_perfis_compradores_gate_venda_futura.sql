-- 0036: exigência de pessoa jurídica (CNPJ ou Inscrição Estadual de produtor
-- rural) para comprar no Mercado Futuro (venda_futura_id), decisão do dono
-- 2026-07-10 (docs/e5-seller-onboarding-b2b-auditoria.md, seção 3). A loja
-- segue vendendo B2B e B2C sem segmentação nenhuma — a única trava do
-- sistema é esta, no checkout, e só quando o carrinho tem item de venda
-- futura.
--
-- Reescreve checkout_criar_pedido combinando: a base mais recente de master
-- (0029: lock de linha via `for update`, checagem de duplicado, valor mínimo
-- da loja, permite_retirada_na_loja) + a lógica de venda futura/desconto
-- progressivo (0016/preco_faixa, perdida nas migrations 0018-0029 porque
-- foram escritas antes do merge das duas branches — ver nota abaixo) + o
-- novo gate de CNPJ/IE.
--
-- NOTA (achado, não corrigido aqui por estar fora de escopo): a promoção
-- progressiva (preco_faixa) já estava ausente da versão de checkout_criar_pedido
-- em produção em master antes desta migration — migrations 0018-0029 recriaram
-- a função sem essa lógica. Esta migration já a restaura como efeito colateral
-- de reunificar as duas histórias, mas vale confirmar com o dono se isso não
-- estava assim de propósito antes de assumir que é bug.

-- ============ Perfil de documento do comprador ============
create table public.perfis_compradores (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  tipo_documento   text check (tipo_documento in ('CNPJ', 'IE')),
  documento        text,
  produtor_rural   boolean not null default false,
  razao_social     text,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

alter table public.perfis_compradores enable row level security;

create policy perfis_compradores_self on public.perfis_compradores
  for select using (user_id = auth.uid());

create policy perfis_compradores_self_upsert on public.perfis_compradores
  for insert with check (user_id = auth.uid());

create policy perfis_compradores_self_update on public.perfis_compradores
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.salvar_perfil_comprador_pj(
  p_tipo_documento text,
  p_documento text,
  p_produtor_rural boolean,
  p_razao_social text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digitos text;
begin
  if auth.uid() is null then
    raise exception 'Faça login.';
  end if;
  if p_tipo_documento not in ('CNPJ', 'IE') then
    raise exception 'Tipo de documento inválido (use CNPJ ou IE).';
  end if;
  v_digitos := regexp_replace(coalesce(p_documento, ''), '\D', '', 'g');
  if p_tipo_documento = 'CNPJ' and length(v_digitos) <> 14 then
    raise exception 'CNPJ inválido: deve ter 14 dígitos.';
  end if;
  if p_tipo_documento = 'IE' and length(trim(coalesce(p_documento, ''))) = 0 then
    raise exception 'Inscrição Estadual não pode ser vazia.';
  end if;

  insert into perfis_compradores (user_id, tipo_documento, documento, produtor_rural, razao_social, atualizado_em)
  values (auth.uid(), p_tipo_documento, p_documento, coalesce(p_produtor_rural, false), p_razao_social, now())
  on conflict (user_id) do update
    set tipo_documento = excluded.tipo_documento,
        documento = excluded.documento,
        produtor_rural = excluded.produtor_rural,
        razao_social = excluded.razao_social,
        atualizado_em = now();
end;
$$;

revoke all on function public.salvar_perfil_comprador_pj(text, text, boolean, text) from public;
grant execute on function public.salvar_perfil_comprador_pj(text, text, boolean, text) to authenticated;

-- ============ Gate no checkout ============
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

  -- Gate B2B: qualquer item com venda_futura_id exige CNPJ/IE cadastrado.
  -- Bloqueia o pedido inteiro (carrinho já trava a UMA loja só; não existe
  -- conceito de aprovação parcial nesta RPC).
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
    select percentual into v_percentual
    from faixas_cep
    where ativo and v_cep between cep_inicial and cep_final
    order by (cep_final - cep_inicial) asc
    limit 1;
    if v_percentual is null then
      raise exception 'Entrega indisponível para o CEP informado. Escolha retirada na loja.';
    end if;
  end if;

  -- valida itens contra o banco, trava a linha do produto (evita corrida
  -- entre RPCs concorrentes) e trava a loja (carrinho é de UMA loja)
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

  select valor_pedido_minimo, permite_retirada_na_loja into v_minimo, v_permite_retirada
    from lojas where id = v_loja;
  if v_total_itens < coalesce(v_minimo, 0) then
    raise exception 'Pedido abaixo do valor mínimo da loja (R$ %).', v_minimo;
  end if;
  if v_retirada and not coalesce(v_permite_retirada, false) then
    raise exception 'Esta loja não permite retirada. Escolha entrega.';
  end if;

  if not v_retirada then
    v_frete := round(v_total_itens * v_percentual / 100, 2);
  end if;

  insert into pedidos (id_venda, loja_id, cliente_id, data, status_pedido,
                       valor_pedido, forma_pagamento)
  values (upper(substr(md5(random()::text), 1, 10)), v_loja, v_user, now(),
          'Aguardando Pagamento', v_total_itens + v_frete, forma_pagamento)
  returning id into v_pedido;

  for v_item in select * from jsonb_array_elements(itens) loop
    v_qtd := (v_item->>'quantidade')::int;
    select p.id, p.nome, p.valor into v_prod
    from produtos p where p.id = (v_item->>'produto_id')::uuid;

    v_vf_id := nullif(v_item->>'venda_futura_id', '')::uuid;
    if v_vf_id is not null then
      select valor into v_preco_unit from vendas_futuras where id = v_vf_id;
      v_preco_unit := coalesce(v_preco_unit, v_prod.valor);
    else
      v_preco_unit := preco_faixa(v_prod.id, v_qtd, v_prod.valor);
    end if;
    v_valor_item := v_preco_unit * v_qtd;

    -- afiliado aprovado mais recente do produto (ou da loja), se houver
    select a.afiliado_id, a.porcentagem into v_afil
    from afiliacoes a
    where a.status = 'Aprovada'
      and (a.produto_id = v_prod.id or a.loja_id = v_loja)
    order by a.produto_id nulls last, a.created_at desc
    limit 1;

    insert into linha_itens (pedido_id, produto_id, produto_nome, quantidade,
      valor, repasse_ind, repasse_afiliado, afiliado_id, venda_futura_id,
      retirar_na_loja, valor_frete,
      entrega_cep, entrega_rua, entrega_numero, entrega_bairro,
      entrega_cidade, entrega_complemento)
    values (v_pedido, v_prod.id, v_prod.nome, v_qtd,
      v_valor_item,
      round(v_valor_item * 0.05, 2),                                   -- 5% plataforma
      case when v_afil.afiliado_id is null then 0
           else round(v_valor_item * v_afil.porcentagem / 100, 2) end,
      v_afil.afiliado_id,
      v_vf_id,
      v_retirada,
      case when v_retirada then null
           else round(v_valor_item * v_percentual / 100, 2) end,
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

  return v_pedido;
end;
$$;

revoke all on function public.checkout_criar_pedido(jsonb, jsonb, text) from public;
grant execute on function public.checkout_criar_pedido(jsonb, jsonb, text) to authenticated;
