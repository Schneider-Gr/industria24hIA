-- 0140: checkout_criar_pedido (BASE de 3 args) aceita transportadora
-- fonte='uber_direct', usando a cotação salva em cotacoes_frete_externo
-- (0139) em vez do percentual de faixas_cep. cotar_frete_interno extrai o
-- match de faixa que já existe dentro do RPC (0101) para reaproveito pela
-- rota de cotação.
--
-- IMPORTANTE (achado ao aplicar): checkout_criar_pedido tem uma cadeia de
-- overloads por aridade — 3 args (base, redefinida por último em 0101), 4
-- (+ref, 0065/0119), 5 (+frete_consolidado, 0074), 6 (+cliente_nome, 0107) —
-- cada wrapper delega pro de aridade menor repassando `entrega` intacto
-- (ver 0107: "não dá para adicionar parâmetro à função base... colidiria em
-- tipo com um overload já existente"). Por isso esta migration NÃO dropa
-- nem muda a assinatura da base: só estende o BODY dela, e o parâmetro da
-- cotação Uber Direct viaja dentro de `entrega->>'cotacao_externa_id'`
-- (mesmo padrão de `entrega->>'transportadora_id'`, 0101) — chega intacto
-- em qualquer aridade que o checkout chamar, sem tocar nos wrappers.

create or replace function public.cotar_frete_interno(p_loja_id uuid, p_cep int)
returns table (transportadora_id uuid, percentual numeric)
language sql
stable
security definer
set search_path = public
as $$
  select f.transportadora_id, f.percentual
  from faixas_cep f
  where f.ativo
    and p_cep between f.cep_inicial and f.cep_final
    and (f.loja_id = p_loja_id or f.loja_id is null)
    and (f.transportadora_id is null or exists (
      select 1 from transportadoras t
      where t.id = f.transportadora_id and t.ativo and t.fonte = 'interna'
        and (t.loja_id = p_loja_id or t.loja_id is null)
    ))
  order by (f.loja_id = p_loja_id) desc, (f.cep_final - f.cep_inicial) asc
  limit 1;
$$;

revoke all on function public.cotar_frete_interno(uuid, int) from public;
grant execute on function public.cotar_frete_interno(uuid, int) to authenticated;

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

  -- Transportadora escolhida (se houver): tem que estar ativa, cobrir a loja
  -- (própria ou global). 'mercado_envios' cota fora do banco, ainda não
  -- suportado no checkout. 'uber_direct' usa a cotação salva (abaixo).
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

  -- CEP validado contra a loja já resolvida e contra a transportadora escolhida
  -- (só para o caminho 'interna'/sem transportadora — uber_direct já resolveu
  -- o frete acima, via cotação salva, e ignora faixas_cep):
  -- `transportadora_id is not distinct from v_transportadora` casa faixa sem
  -- carrier (null=null, comportamento atual) ou faixa da carrier escolhida.
  if not v_retirada and v_transp_fonte is distinct from 'uber_direct' then
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

  if not v_retirada and v_transp_fonte is distinct from 'uber_direct' then
    v_frete := round(v_total_itens * v_percentual / 100, 2);
  end if;

  perform set_config('app.checkout_rpc', 'on', true);

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

    select a.afiliado_id, a.porcentagem into v_afil
    from afiliacoes a
    where a.status = 'Aprovada'
      and (a.produto_id = v_prod.id or a.loja_id = v_loja)
    order by a.produto_id nulls last, a.created_at desc
    limit 1;

    insert into linha_itens (pedido_id, produto_id, produto_nome, quantidade,
      valor, repasse_ind, repasse_afiliado, afiliado_id, venda_futura_id,
      retirar_na_loja, valor_frete, transportadora_id,
      entrega_cep, entrega_rua, entrega_numero, entrega_bairro,
      entrega_cidade, entrega_complemento)
    values (v_pedido, v_prod.id, v_prod.nome, v_qtd,
      v_valor_item,
      round(v_valor_item * 0.05, 2),
      case when v_afil.afiliado_id is null then 0
           else round(v_valor_item * v_afil.porcentagem / 100, 2) end,
      v_afil.afiliado_id,
      v_vf_id,
      v_retirada,
      case when v_retirada then null
           when v_transp_fonte = 'uber_direct' then round(v_frete * v_valor_item / nullif(v_total_itens, 0), 2)
           else round(v_valor_item * v_percentual / 100, 2) end,
      case when v_retirada then null else v_transportadora end,
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
