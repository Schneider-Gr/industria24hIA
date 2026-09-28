-- 0207: entrega por parceiro local no checkout (PRD 056, Milestone 1).
--
-- O comprador paga a banda do seller no avião, com a mesma regra do simulador:
-- maior entre a tarifa mínima e km (só ida, Google) × R$/km da banda única do
-- carrinho da loja, + balsa quando a rota tem barco. Quem calcula é o servidor
-- (src/lib/logistica-parceiro/frete-parceiro-local.ts, que chama o mesmo
-- freteRegiao do simulador); o banco só guarda e confere a cotação.
--
-- 1. cotacoes_parceiro_local: gravada pela rota /api/checkout/cotar-frete com
--    service role. RLS ligada e sem policy: ninguém lê nem escreve pela API; a
--    checkout_criar_pedido (security definer) confere comprador, loja, CEP,
--    itens e validade, como a cotação do vendedor (0203).
-- 2. checkout_criar_pedido: fonte nova 'parceiro_local' (base: 0205, idêntica à
--    de produção em 28/09 salvo um comentário). Frete rateado pelas linhas como
--    as cotações; frete_destinatario = 'terceiro' (o parceiro recebe pela
--    corrida, não pelo repasse do seller). Frete consolidado não se aplica.
-- 3. despachar_corrida_automatica (base: 0102): a corrida da entrega por
--    parceiro local nasce com o peso da cotação e a descrição "Carro · 150 kg ·
--    com balsa". Valor (preco_final = frete do pedido), afiliado da loja com 5
--    min de exclusividade e pool continuam iguais.

create table if not exists public.cotacoes_parceiro_local (
  id              uuid primary key default gen_random_uuid(),
  loja_id         uuid not null references public.lojas (id) on delete cascade,
  comprador_id    uuid not null references auth.users (id) on delete cascade,
  cep             text not null check (cep ~ '^[0-9]{8}$'),
  itens_chave     text not null,
  valor_centavos  integer not null check (valor_centavos > 0),
  classe          text not null check (classe in ('moto', 'carro', 'caminhao')),
  peso_kg         numeric(10,3) not null check (peso_kg > 0),
  km              numeric(10,1) not null check (km >= 0),
  balsa_centavos  integer not null default 0 check (balsa_centavos >= 0),
  duracao_s       integer,
  status          text not null default 'aberta' check (status in ('aberta', 'usada')),
  pedido_id       uuid references public.pedidos (id) on delete set null,
  expira_em       timestamptz not null,
  criado_em       timestamptz not null default now()
);

alter table public.cotacoes_parceiro_local enable row level security;

create index if not exists cotacoes_parceiro_local_comprador_idx
  on public.cotacoes_parceiro_local (comprador_id, criado_em desc);
create index if not exists cotacoes_parceiro_local_pedido_idx
  on public.cotacoes_parceiro_local (pedido_id) where pedido_id is not null;

comment on table public.cotacoes_parceiro_local is
  'Cotação da entrega por parceiro local (0207, PRD 056): banda do seller + rota do Google, gravada só pelo servidor; o checkout confere antes de criar o pedido.';

-- ---------------------------------------------------------------- checkout
-- Base: 0205 (vigente). Mudanças marcadas com "0207".
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
  -- 0203: frete a combinar
  v_cot_id uuid;
  v_cot public.cotacoes_frete_vendedor;
  v_tudo boolean := false;
  v_tem_combinar boolean := false;
  v_tem_normal boolean := false;
  -- 0207: entrega por parceiro local (PRD 056)
  v_cpl_id uuid;
  v_cpl public.cotacoes_parceiro_local;
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
    v_cot_id := nullif(entrega->>'cotacao_vendedor_id', '')::uuid;
    v_tudo := coalesce((entrega->>'tudo_com_vendedor')::boolean, false);
    v_cpl_id := nullif(entrega->>'cotacao_parceiro_id', '')::uuid;
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

    select p.id, p.loja_id, p.nome, p.valor, p.estoque_atual, p.quantidade_minima, p.frete_a_combinar
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
    if v_prod.frete_a_combinar then
      v_tem_combinar := true;
    else
      v_tem_normal := true;
    end if;
  end loop;

  -- 0203: produto com frete a combinar só sai com entrega pela cotação do
  -- vendedor; qualquer outro frete fica desativado para ele (decisão da dona,
  -- 28/09). Retirada continua valendo.
  if not v_retirada and v_tem_combinar and v_cot_id is null then
    raise exception 'Este pedido tem produto com frete a combinar. Peça a cotação ao vendedor ou escolha retirada.';
  end if;
  if not v_retirada and v_cot_id is not null then
    select * into v_cot from public.cotacoes_frete_vendedor where id = v_cot_id for update;
    if not found
       or v_cot.comprador_id <> v_user
       or v_cot.loja_id <> v_loja
       or v_cot.cep_destino <> lpad(v_cep::text, 8, '0')
       or v_cot.valida_ate is null or v_cot.valida_ate < now()
       or not (v_cot.status = 'respondida'
               or (v_cot.status = 'usada' and exists (
                     select 1 from pedidos where id = v_cot.pedido_id and status_pedido = 'Cancelado')))
       or (v_tudo and (v_cot.valor_carrinho_centavos is null
                       or public.cotacao_itens_chave(v_cot.itens || coalesce(v_cot.itens_carrinho, '[]'::jsonb))
                          <> public.cotacao_itens_chave(itens)))
       or (not v_tudo and (v_tem_normal or v_cot.itens_chave <> public.cotacao_itens_chave(itens)))
    then
      raise exception 'A cotação do frete mudou ou venceu. Revise a entrega.';
    end if;
    v_frete := round(case when v_tudo then v_cot.valor_carrinho_centavos else v_cot.valor_centavos end / 100.0, 2);
    v_transp_fonte := 'cotacao_vendedor';
    v_transportadora := null;
  end if;

  -- 0207 (PRD 056): entrega por parceiro local. O valor vem da cotação gravada
  -- pelo servidor (banda do seller + rota do Google), nunca do navegador; ela
  -- tem de ser deste comprador, desta loja, deste CEP e destes itens.
  if not v_retirada and v_cpl_id is not null then
    if v_cot_id is not null then
      raise exception 'Escolha uma forma de entrega só.';
    end if;
    select * into v_cpl from public.cotacoes_parceiro_local where id = v_cpl_id for update;
    if not found
       or v_cpl.comprador_id <> v_user
       or v_cpl.loja_id <> v_loja
       or v_cpl.cep <> lpad(v_cep::text, 8, '0')
       or v_cpl.status <> 'aberta'
       or v_cpl.expira_em < now()
       or v_cpl.itens_chave <> public.cotacao_itens_chave(itens)
    then
      raise exception 'A cotação da entrega por parceiro local mudou ou venceu. Revise a entrega.';
    end if;
    v_frete := round(v_cpl.valor_centavos / 100.0, 2);
    v_transp_fonte := 'parceiro_local';
    v_transportadora := null;
  end if;

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

  if not v_retirada and coalesce(v_transp_fonte, '') not in ('uber_direct', 'tabela_importada', 'cotacao_vendedor', 'parceiro_local') then
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

  if not v_retirada and coalesce(v_transp_fonte, '') not in ('uber_direct', 'tabela_importada', 'cotacao_vendedor', 'parceiro_local') then
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
    elsif v_transp_fonte in ('uber_direct', 'tabela_importada', 'cotacao_vendedor', 'parceiro_local') then
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
      retirar_na_loja, valor_frete, transportadora_id, cotacao_vendedor_id, frete_destinatario,
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
      case when v_transp_fonte = 'cotacao_vendedor' then v_cot_id end,
      -- 0205 (PRD 052): quem recebe o frete. Seller quando ele entrega ou paga
      -- a entrega; terceiro quando a plataforma paga a outro (Uber Direct) ou
      -- entrega com transportadora global dela.
      case
        when v_retirada or coalesce(v_frete_linha, 0) = 0 then null
        when v_transp_fonte = 'uber_direct' then 'terceiro'
        -- 0207: o parceiro local recebe pela corrida, não pelo repasse do seller.
        when v_transp_fonte = 'parceiro_local' then 'terceiro'
        when v_transp_fonte in ('cotacao_vendedor', 'tabela_importada') then 'seller'
        when v_transportadora is null then 'seller'
        when exists (select 1 from transportadoras t where t.id = v_transportadora and t.loja_id is null) then 'terceiro'
        else 'seller'
      end,
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

  if v_transp_fonte = 'cotacao_vendedor' then
    update public.cotacoes_frete_vendedor set status = 'usada', pedido_id = v_pedido where id = v_cot_id;
  end if;
  if v_transp_fonte = 'parceiro_local' then
    update public.cotacoes_parceiro_local set status = 'usada', pedido_id = v_pedido where id = v_cpl_id;
  end if;

  if v_cupom_id is not null and v_desc_total = 0 then
    perform public.cupom_liberar_uso_pedido(v_pedido);
  end if;

  return v_pedido;
end;
$function$;

CREATE OR REPLACE FUNCTION public.checkout_criar_pedido(itens jsonb, entrega jsonb, forma_pagamento text, ref text, frete_consolidado boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_pedido uuid;
  v_desconto numeric(12,2);
begin
  -- 0207 (PRD 056): o frete do parceiro local é o da cotação; não entra em lote.
  if frete_consolidado and nullif(entrega->>'cotacao_parceiro_id', '') is not null then
    raise exception 'Frete consolidado não vale para entrega por parceiro local.';
  end if;
  v_pedido := public.checkout_criar_pedido(itens, entrega, forma_pagamento, ref);

  -- só se aplica a entrega com frete cobrado (retirada na loja não tem frete)
  if not frete_consolidado then
    return v_pedido;
  end if;

  -- 30% de desconto no frete de cada linha (decisão 23/07/2026).
  -- Desconto calculado ANTES do update (old - round(old*0.7)) para o abate no
  -- valor_pedido bater centavo a centavo com a soma das linhas.
  select coalesce(sum(valor_frete - round(valor_frete * 0.70, 2)), 0)
    into v_desconto
  from linha_itens
  where pedido_id = v_pedido and coalesce(valor_frete, 0) > 0
    and cotacao_vendedor_id is null; -- 0203: frete cotado pelo vendedor não tem desconto

  update linha_itens
  set valor_frete = round(valor_frete * 0.70, 2),
      -- 0205 (PRD 052): frete consolidado sai na rota de lote da plataforma.
      frete_destinatario = 'terceiro'
  where pedido_id = v_pedido and coalesce(valor_frete, 0) > 0
    and cotacao_vendedor_id is null; -- 0203: frete cotado pelo vendedor não tem desconto

  if v_desconto > 0 then
    update pedidos
    set valor_pedido = round(valor_pedido - v_desconto, 2),
        frete_consolidado = true
    where id = v_pedido;
  end if;

  return v_pedido;
end;
$function$;

-- ---------------------------------------------------------------- corrida
-- Base: 0102 (vigente). Mudanças: peso_kg e descricao_carga da cotação do parceiro local.
create or replace function public.despachar_corrida_automatica(p_pedido_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_ja_existe uuid;
  v_pedido record;
  v_item record;
  v_frete_total numeric(12,2);
  v_loja record;
  v_afiliado uuid;
  v_requer_revisao boolean;
  v_id uuid;
  v_cpl record; -- 0207
begin
  select id into v_ja_existe from corridas where pedido_id = p_pedido_id;
  if v_ja_existe is not null then
    return v_ja_existe; -- idempotente
  end if;

  select id, loja_id, frete_consolidado into v_pedido from pedidos where id = p_pedido_id;
  if not found then raise exception 'Pedido não encontrado.'; end if;

  -- 0074: consolidado espera o lote do admin (webhook trata null como "sem corrida")
  if v_pedido.frete_consolidado then
    return null;
  end if;

  select entrega_cep, entrega_rua, entrega_numero, entrega_bairro,
         entrega_cidade, entrega_complemento
    into v_item
  from linha_itens
  where pedido_id = p_pedido_id and retirar_na_loja = false and entrega_cep is not null
  limit 1;
  if not found then
    return null; -- retirada na loja: sem corrida
  end if;

  -- frete total do pedido (todas as linhas de entrega), não o de uma linha só
  select coalesce(sum(valor_frete), 0) into v_frete_total
  from linha_itens
  where pedido_id = p_pedido_id and retirar_na_loja = false;

  -- 0207 (PRD 056): entrega por parceiro local traz peso, veículo e balsa da cotação.
  select peso_kg, classe, balsa_centavos into v_cpl
  from cotacoes_parceiro_local where pedido_id = p_pedido_id;

  select cep, rua, numero, cidade, estado into v_loja
  from lojas where id = v_pedido.loja_id;

  -- afiliado exclusivo só se nenhum item com entrega estiver desabilitado
  select afiliado_id into v_afiliado
  from afiliacoes
  where loja_id = v_pedido.loja_id and tipo = 'logistica' and status = 'Aprovada'
    and not exists (
      select 1 from linha_itens li
      join produtos pr on pr.id = li.produto_id
      where li.pedido_id = p_pedido_id and li.retirar_na_loja = false
        and pr.permite_logistica_afiliado = false)
  order by created_at asc
  limit 1;

  -- algum item do pedido pede revisão do afiliado antes do despacho?
  select exists (
    select 1 from linha_itens li
    join produtos pr on pr.id = li.produto_id
    where li.pedido_id = p_pedido_id and li.retirar_na_loja = false
      and pr.parceiro_logistico_habilitado
  ) into v_requer_revisao;

  insert into corridas (
    solicitante_id, pedido_id,
    origem_cep, origem_endereco,
    destino_cep, destino_endereco,
    peso_kg, modo, preco_sugerido, preco_final,
    janela_inicio, janela_fim,
    afiliado_exclusivo_id, exclusividade_fim,
    requer_revisao_afiliado, descricao_carga
  )
  select
    pe.cliente_id, p_pedido_id,
    coalesce(v_loja.cep, ''), concat_ws(', ', v_loja.rua, v_loja.numero, v_loja.cidade, v_loja.estado, v_loja.cep),
    v_item.entrega_cep, concat_ws(', ', v_item.entrega_rua, v_item.entrega_numero, v_item.entrega_bairro, v_item.entrega_cidade, v_item.entrega_complemento),
    -- peso_kg: o da cotação do parceiro local; sem ela, placeholder (NOT NULL exige > 0)
    coalesce(nullif(v_cpl.peso_kg, 0), 1),
    'primeiro_aceita',
    v_frete_total, v_frete_total,
    now(), now() + interval '4 hours', -- janela da 0048 (4h pro parceiro coletar)
    v_afiliado, case when v_afiliado is not null then now() + interval '5 minutes' else null end,
    (v_requer_revisao and v_afiliado is not null),
    case when v_cpl.classe is not null then
      concat_ws(' · ', 'Entrega por parceiro local',
        case v_cpl.classe when 'moto' then 'Moto' when 'carro' then 'Carro' else 'Caminhão' end,
        replace(trim(trailing '.' from trim(trailing '0' from v_cpl.peso_kg::text)), '.', ',') || ' kg',
        case when v_cpl.balsa_centavos > 0 then
          'com balsa (R$ ' || replace(to_char(v_cpl.balsa_centavos / 100.0, 'FM999990.00'), '.', ',') || ')' end)
    end
  from pedidos pe where pe.id = p_pedido_id
  returning id into v_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (null, 'sistema', 'corrida.despacho_automatico', 'corridas', v_id,
          jsonb_build_object('pedido_id', p_pedido_id, 'afiliado_exclusivo_id', v_afiliado,
                              'requer_revisao_afiliado', v_requer_revisao and v_afiliado is not null));

  return v_id;
end; $$;
revoke all on function public.despachar_corrida_automatica(uuid) from public, anon;
grant execute on function public.despachar_corrida_automatica(uuid) to authenticated, service_role;
