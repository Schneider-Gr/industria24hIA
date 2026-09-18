-- 0189: comissao da plataforma pelo no da arvore de taxonomia (PRD 044).
--
-- Precedencia, do mais especifico ao padrao:
--   1. percentual do no da arvore do produto (produtos.taxonomia_no_id), o
--      proprio ou o do ancestral mais proximo que tenha um;
--   2. subcategoria (0180);
--   3. categoria (0180);
--   4. padrao de 5%.
-- Arvore sem nenhum percentual na cadeia devolve NULL e cai no legado, entao
-- nenhum preco muda no deploy: hoje nenhum no tem comissao_pct.
--
-- Tambem fecha tres pontos que ignoravam a 0180 e cobravam 5% fixo:
-- cupom_validar (previa do desconto limitada ao repasse), coletiva_participar e
-- coletiva_fechar (compra coletiva). As quatro funcoes abaixo foram GERADAS de
-- pg_get_functiondef de producao com uma troca por ancora unica (C:\tmp\q189\gen.py).

create or replace function public.taxonomia_comissao_pct_explicito(p_no_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with recursive sobe as (
    select id, parent_id, comissao_pct, 0 as passo
    from public.taxonomia_nos where id = p_no_id
    union all
    select t.id, t.parent_id, t.comissao_pct, s.passo + 1
    from public.taxonomia_nos t
    join sobe s on t.id = s.parent_id
    where s.comissao_pct is null and s.passo < 20
  )
  select comissao_pct from sobe where comissao_pct is not null order by passo limit 1;
$$;

create or replace function public.comissao_pct_produto(p_produto_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.taxonomia_comissao_pct_explicito(p.taxonomia_no_id),
    public.comissao_pct_item(p.categoria_id, p.subcategoria_id)
  )
  from public.produtos p
  where p.id = p_produto_id;
$$;

grant execute on function public.comissao_pct_produto(uuid) to authenticated;

-- Mercado Livre (MLB) como terceira fonte. A arvore (12.233 nos) foi varrida de
-- api.mercadolibre.com/categories/{id} a partir das 32 raizes; o snapshot fica em
-- supabase/seed/taxonomia_mercadolivre.txt e entra por taxonomia_importar.
alter table public.taxonomia_nos drop constraint if exists taxonomia_nos_origem_check;
alter table public.taxonomia_nos
  add constraint taxonomia_nos_origem_check check (origem in ('google', 'martins', 'mercadolivre', 'local'));

create or replace function public.taxonomia_importar(p_conteudo text, p_origem text default 'google')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previa jsonb;
  v_nivel int;
  v_max int;
  v_obsoletos int;
begin
  if p_origem not in ('google', 'martins', 'mercadolivre') then
    raise exception 'Fonte desconhecida: %', p_origem;
  end if;

  v_previa := public.taxonomia_importar_previa(p_conteudo, p_origem);

  if (v_previa->>'linhas')::int = 0 then
    raise exception 'Arquivo sem nos reconheciveis. Esperado "<id> - A > B > C" por linha.';
  end if;

  create temp table _arq on commit drop as
    select * from public.taxonomia_parse(p_conteudo);

  select max(nivel) into v_max from _arq;

  for v_nivel in 1..v_max loop
    insert into public.taxonomia_nos (origem, origem_id, nome, parent_id, caminho, nivel)
    select p_origem, a.origem_id, a.nome, p.id, a.caminho, a.nivel
    from _arq a
    left join public.taxonomia_nos p
      on p.caminho = left(a.caminho, length(a.caminho) - length(a.nome) - 3)
     and a.nivel > 1
    where a.nivel = v_nivel
      and not exists (
        select 1 from public.taxonomia_nos t
        where t.origem = p_origem and t.origem_id = a.origem_id
      )
    on conflict (caminho) do nothing;
  end loop;

  update public.taxonomia_nos t
  set obsoleto = true, selecionavel = false
  where t.origem = p_origem
    and not exists (select 1 from _arq a where a.origem_id = t.origem_id)
    and t.obsoleto = false;
  get diagnostics v_obsoletos = row_count;

  insert into public.taxonomia_importacoes
    (versao, origem, autor, linhas, nos_novos, nos_existentes, nos_obsoletos)
  values (
    v_previa->>'versao', p_origem, auth.uid(),
    (v_previa->>'linhas')::int, (v_previa->>'novos')::int,
    (v_previa->>'existentes')::int, v_obsoletos
  );

  return v_previa || jsonb_build_object('obsoletos', v_obsoletos, 'aplicado', true);
end;
$$;


-- checkout_criar_pedido(jsonb,jsonb,text): gerada de pg_get_functiondef de producao (18/09) com a troca acima.
CREATE OR REPLACE FUNCTION public.checkout_criar_pedido(itens jsonb, entrega jsonb, forma_pagamento text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_com_pct numeric(5,2);
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

    -- 0177: devolve ao saldo a reserva vencida de OUTRO pedido antes de decidir
    -- se há estoque. Sem isto o comprador veria "estoque insuficiente" enquanto
    -- o saldo está travado por um pedido que ninguém vai pagar — que é o estado
    -- de produção hoje (5.642 unidades presas em 80 pedidos, o mais antigo de
    -- junho de 2025). A expiração acontece na leitura e não só no cron, para que
    -- a falha do cron não trave estoque.
    perform public.estoque_reservas_expirar((v_item->>'produto_id')::uuid);

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
       -- 0172: cupom nunca derruba o pedido abaixo do ticket mínimo da loja.
       -- O desconto é estimado aqui (cupom_validar é read-only) ANTES de
       -- reivindicar o uso e de gravar qualquer linha; reprovando, o cupom
       -- simplesmente não se aplica e o pedido segue pelo valor cheio.
       and (
         coalesce(v_minimo, 0) = 0
         or v_total_itens
            - coalesce((public.cupom_validar(v_cupom_codigo, itens)->>'desconto_total')::numeric, 0)
            >= v_minimo
       )
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
    select p.id, p.nome, p.valor, p.categoria_id, p.subcategoria_id, p.loja_id into v_prod
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

    -- 0180: comissao da plataforma vem da taxonomia do produto
    -- (subcategoria > categoria > padrao de 5%), e nao mais da constante.
    v_com_pct := public.comissao_pct_produto(v_prod.id);

    if v_com_pct + coalesce(v_afil.porcentagem, 0) > 100 then
      raise exception 'Comissao da plataforma (% por cento) somada a do afiliado (% por cento) passa de 100 por cento do item %. Ajuste o percentual da categoria.',
        v_com_pct, coalesce(v_afil.porcentagem, 0), v_prod.nome;
    end if;

    v_repasse_ind := round(v_valor_item * v_com_pct / 100, 2);

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
      valor, repasse_ind, repasse_ind_pct, repasse_afiliado, afiliado_id, venda_futura_id,
      retirar_na_loja, valor_frete, transportadora_id,
      cupom_id, desconto_cupom,
      entrega_cep, entrega_rua, entrega_numero, entrega_bairro,
      entrega_cidade, entrega_complemento)
    values (v_pedido, v_prod.id, v_prod.nome, v_qtd,
      v_valor_item,
      v_repasse_ind,
      v_com_pct,
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

    -- 0177: o decremento acima deixa de ser baixa anônima e definitiva e passa a
    -- ter um registro que sabe a quem pertence e quando vence. O número não
    -- mudou de significado: estoque_atual segue sendo o DISPONÍVEL, que é o que
    -- as 124 referências do código leem.
    insert into public.estoque_reservas
      (pedido_id, produto_id, venda_futura_id, quantidade, expira_em)
    values (v_pedido, v_prod.id, v_vf_id, v_qtd,
            clock_timestamp() + public.estoque_reserva_prazo());
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
$function$;

-- cupom_validar(text,jsonb): gerada de pg_get_functiondef de producao (18/09) com a troca acima.
CREATE OR REPLACE FUNCTION public.cupom_validar(p_codigo text, p_itens jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    v_repasse_ind := round(v_valor_item * public.comissao_pct_produto(v_prod.id) / 100, 2);
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
$function$;

-- coletiva_participar(uuid,integer): gerada de pg_get_functiondef de producao (18/09) com a troca acima.
CREATE OR REPLACE FUNCTION public.coletiva_participar(p_coletiva_id uuid, p_quantidade integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_col record;
  v_prod record;
  v_part record;
  v_pedido uuid;
  v_meu_pedido uuid;
  v_valor_item numeric(12,2);
  v_ja_participa boolean;
  v_total_part int;
begin
  if v_user is null then
    raise exception 'Faça login para participar da compra coletiva.';
  end if;
  if p_quantidade is null or p_quantidade < 1 then
    raise exception 'Quantidade inválida.';
  end if;

  -- lock serializa participações concorrentes na mesma coletiva
  select * into v_col from compras_coletivas
  where id = p_coletiva_id
  for update;
  if not found then
    raise exception 'Compra coletiva não encontrada.';
  end if;
  if v_col.status <> 'Aberta' then
    raise exception 'Esta compra coletiva não está mais aberta (%).', v_col.status;
  end if;
  if v_col.prazo < now() then
    update compras_coletivas set status = 'Expirada' where id = v_col.id;
    raise exception 'Esta compra coletiva expirou sem atingir a meta.';
  end if;

  if v_col.max_participantes is not null then
    select exists (
      select 1 from coletiva_participacoes
      where coletiva_id = v_col.id and user_id = v_user
    ) into v_ja_participa;

    if not v_ja_participa then
      select count(*) into v_total_part
      from coletiva_participacoes where coletiva_id = v_col.id;

      if v_total_part >= v_col.max_participantes then
        raise exception 'Esta compra coletiva já tem o número máximo de participantes definido pelo vendedor (%).',
          v_col.max_participantes;
      end if;
    end if;
  end if;

  select p.id, p.loja_id, p.nome, p.estoque_atual into v_prod
  from produtos p
  join lojas l on l.id = p.loja_id
  where p.id = v_col.produto_id
    and p.status_produto = 'Aprovado'
    and l.situacao = 'Ativa';
  if not found then
    raise exception 'Produto indisponível.';
  end if;
  if v_col.qtd_atual + p_quantidade > v_prod.estoque_atual then
    raise exception 'Estoque insuficiente de "%" (disponível: %).',
      v_prod.nome, v_prod.estoque_atual - v_col.qtd_atual;
  end if;

  insert into coletiva_participacoes (coletiva_id, user_id, quantidade)
  values (v_col.id, v_user, p_quantidade)
  on conflict (coletiva_id, user_id)
  do update set quantidade = coletiva_participacoes.quantidade + excluded.quantidade;

  update compras_coletivas
  set qtd_atual = qtd_atual + p_quantidade
  where id = v_col.id
  returning * into v_col;

  -- Meta atingida: cria UM pedido por participante ao preço da faixa,
  -- retirada na loja, 5% de repasse da plataforma, sem afiliado.
  if v_col.qtd_atual >= v_col.meta_qtd then
    perform set_config('app.checkout_rpc', 'on', true);

    for v_part in
      select * from coletiva_participacoes
      where coletiva_id = v_col.id and pedido_id is null
    loop
      v_valor_item := round(v_col.valor_unitario * v_part.quantidade, 2);

      insert into pedidos (id_venda, loja_id, cliente_id, data, status_pedido,
                           valor_pedido, forma_pagamento)
      values (upper(substr(md5(random()::text), 1, 10)), v_col.loja_id,
              v_part.user_id, now(), 'Aguardando Pagamento', v_valor_item, 'PIX')
      returning id into v_pedido;

      insert into linha_itens (pedido_id, produto_id, produto_nome, quantidade,
        valor, repasse_ind, repasse_afiliado, retirar_na_loja, valor_frete)
      values (v_pedido, v_prod.id, v_prod.nome, v_part.quantidade,
        v_valor_item, round(v_valor_item * public.comissao_pct_produto(v_prod.id) / 100, 2), 0, true, null);

      update coletiva_participacoes set pedido_id = v_pedido where id = v_part.id;
      if v_part.user_id = v_user then
        v_meu_pedido := v_pedido;
      end if;
    end loop;

    update produtos set estoque_atual = estoque_atual - v_col.qtd_atual
    where id = v_prod.id;

    update compras_coletivas set status = 'Atingida' where id = v_col.id;
    v_col.status := 'Atingida';
  end if;

  return jsonb_build_object(
    'status', v_col.status,
    'qtd_atual', v_col.qtd_atual,
    'meta_qtd', v_col.meta_qtd,
    'pedido_id', v_meu_pedido
  );
end;
$function$;

-- coletiva_fechar(uuid,boolean): gerada de pg_get_functiondef de producao (18/09) com a troca acima.
CREATE OR REPLACE FUNCTION public.coletiva_fechar(p_coletiva_id uuid, p_forcar boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_col record;
  v_prod record;
  v_owner uuid;
  v_minimo numeric(12,2);
  v_participantes int;
  v_viavel boolean;
  v_ultimo_lote int;
  v_unit numeric(12,2);
  v_total numeric(12,2);
  v_soma numeric(12,2) := 0;
  v_delta numeric(12,2);
  v_percentual numeric;
  v_frete_total numeric(12,2) := 0;
  v_frete_soma numeric(12,2) := 0;
  v_frete_delta numeric(12,2) := 0;
  v_part record;
  v_valor numeric(12,2);
  v_frete numeric(12,2);
  v_primeiro boolean := true;
  v_pedido uuid;
begin
  select c.*, l.owner_id into v_col
  from compras_coletivas c
  join lojas l on l.id = c.loja_id
  where c.id = p_coletiva_id
  for update of c;
  if not found then
    raise exception 'Compra coletiva não encontrada.';
  end if;
  v_owner := v_col.owner_id;

  -- já resolvida: nada a fazer (idempotência)
  if v_col.status in ('Atingida', 'Expirada', 'Cancelada') then
    return jsonb_build_object('status', v_col.status, 'fechou', false);
  end if;

  if p_forcar and v_owner <> auth.uid() then
    raise exception 'Apenas o dono da loja pode fechar esta coletiva manualmente.';
  end if;

  select count(*) into v_participantes
  from coletiva_participacoes where coletiva_id = v_col.id;

  select p.id, p.loja_id, p.nome, p.estoque_atual into v_prod
  from produtos p where p.id = v_col.produto_id;

  v_unit := coletiva_preco_lote(v_col.lotes, v_col.qtd_atual, v_col.preco_base);
  -- coletivas criadas antes da 0076 não têm lotes: preço travado da 0069
  if v_col.lotes = '[]'::jsonb then
    v_unit := v_col.valor_unitario;
  end if;
  v_total := round(v_unit * v_col.qtd_atual, 2);

  select valor_pedido_minimo into v_minimo from lojas where id = v_col.loja_id;

  v_viavel := v_col.qtd_atual >= v_col.meta_qtd
              and v_participantes >= v_col.min_participantes
              and v_total >= coalesce(v_minimo, 0);

  if not v_viavel then
    if v_col.prazo < now() then
      update compras_coletivas set status = 'Expirada' where id = v_col.id;
      perform coletiva_evento(v_col.id, 'expirada',
        jsonb_build_object('qtd_atual', v_col.qtd_atual, 'meta_qtd', v_col.meta_qtd,
                           'participantes', v_participantes));
      return jsonb_build_object('status', 'Expirada', 'fechou', false);
    end if;
    return jsonb_build_object('status', v_col.status, 'fechou', false);
  end if;

  -- Viável: só fecha nos gatilhos combinados.
  select max((elem->>'min_qtd')::int) into v_ultimo_lote
  from jsonb_array_elements(v_col.lotes) elem;

  if not (
    p_forcar
    or v_col.prazo < now()
    or (v_col.max_participantes is not null and v_participantes >= v_col.max_participantes)
    or (v_ultimo_lote is not null and v_col.qtd_atual >= v_ultimo_lote)
    -- Coletiva anterior à 0076 (sem curva de lotes): preço já é fixo, não há
    -- lote seguinte a esperar — fecha na meta, como fazia a 0069.
    or v_col.lotes = '[]'::jsonb
  ) then
    if v_col.status = 'Aberta' then
      update compras_coletivas set status = 'Viavel' where id = v_col.id;
      perform coletiva_evento(v_col.id, 'meta_atingida',
        jsonb_build_object('marco', v_col.meta_qtd::text, 'qtd_atual', v_col.qtd_atual,
                           'preco', v_unit));
    end if;
    return jsonb_build_object('status', 'Viavel', 'fechou', false);
  end if;

  if v_col.qtd_atual > v_prod.estoque_atual then
    raise exception 'Estoque insuficiente de "%" para fechar a coletiva (necessário %, disponível %).',
      v_prod.nome, v_col.qtd_atual, v_prod.estoque_atual;
  end if;

  -- Frete conjunto: um destino, percentual da faixa de CEP como no checkout.
  if v_col.frete_conjunto and v_col.entrega_cep is not null then
    -- faixas_cep guarda o CEP como número; a coletiva guarda texto.
    select percentual into v_percentual
    from faixas_cep
    where ativo
      and regexp_replace(v_col.entrega_cep, '\D', '', 'g')::bigint
          between cep_inicial and cep_final
      and (loja_id = v_col.loja_id or loja_id is null)
    order by (loja_id = v_col.loja_id) desc, (cep_final - cep_inicial) asc,
             (transportadora_id is null) desc
    limit 1;
    if v_percentual is null then
      raise exception 'Entrega indisponível para o CEP da coletiva (%).', v_col.entrega_cep;
    end if;
    v_frete_total := round(v_total * v_percentual / 100, 2);
  end if;

  -- Passada 1: soma dos arredondamentos, para achar a sobra de centavos.
  for v_part in
    select quantidade from coletiva_participacoes where coletiva_id = v_col.id
  loop
    v_soma := v_soma + round(v_unit * v_part.quantidade, 2);
    v_frete_soma := v_frete_soma
      + round(v_frete_total * v_part.quantidade / v_col.qtd_atual, 2);
  end loop;
  v_delta := v_total - v_soma;
  v_frete_delta := v_frete_total - v_frete_soma;

  perform set_config('app.checkout_rpc', 'on', true);

  -- Passada 2: gera um pedido por participante; a sobra vai no maior.
  for v_part in
    select * from coletiva_participacoes
    where coletiva_id = v_col.id
    order by quantidade desc, created_at asc
  loop
    v_valor := round(v_unit * v_part.quantidade, 2);
    v_frete := round(v_frete_total * v_part.quantidade / v_col.qtd_atual, 2);
    if v_primeiro then
      v_valor := v_valor + v_delta;
      v_frete := v_frete + v_frete_delta;
      v_primeiro := false;
    end if;

    -- ponytail: sem guard de pedido_id — só chegamos aqui com a coletiva
    -- Aberta/Viavel, e status Atingida sai antes por idempotência.
    insert into pedidos (id_venda, loja_id, cliente_id, data, status_pedido,
                         valor_pedido, forma_pagamento)
    values (upper(substr(md5(random()::text), 1, 10)), v_col.loja_id,
            v_part.user_id, now(), 'Aguardando Pagamento',
            v_valor + v_frete, 'PIX')
    returning id into v_pedido;

    insert into linha_itens (pedido_id, produto_id, produto_nome, quantidade,
      valor, repasse_ind, repasse_afiliado, retirar_na_loja, valor_frete,
      entrega_cep, entrega_rua, entrega_numero, entrega_bairro,
      entrega_cidade, entrega_complemento)
    values (v_pedido, v_prod.id, v_prod.nome, v_part.quantidade,
      v_valor, round(v_valor * public.comissao_pct_produto(v_prod.id) / 100, 2), 0,
      not v_col.frete_conjunto,
      case when v_col.frete_conjunto then v_frete else null end,
      v_col.entrega_cep, v_col.entrega_rua, v_col.entrega_numero,
      v_col.entrega_bairro, v_col.entrega_cidade, v_col.entrega_complemento);

    update coletiva_participacoes set pedido_id = v_pedido where id = v_part.id;
  end loop;

  update produtos set estoque_atual = estoque_atual - v_col.qtd_atual
  where id = v_prod.id;

  update compras_coletivas
  set status = 'Atingida', valor_unitario = v_unit, fechada_em = now()
  where id = v_col.id;

  perform coletiva_evento(v_col.id, 'fechada',
    jsonb_build_object('valor_unitario', v_unit, 'total', v_total,
                       'frete_total', v_frete_total, 'participantes', v_participantes,
                       'qtd_atual', v_col.qtd_atual));

  return jsonb_build_object(
    'status', 'Atingida',
    'fechou', true,
    'valor_unitario', v_unit,
    'total', v_total,
    'frete_total', v_frete_total,
    'participantes', v_participantes
  );
end;
$function$;
