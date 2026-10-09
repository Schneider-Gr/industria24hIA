-- 0218 — PRD 061 Milestone 1: curva de desconto por antecedência na venda futura.
-- Change openspec venda-futura-curva-e-minimo, design D1–D5.
--
-- 1. vendas_futuras.curva (até 3 degraus {dias_antes, desconto_pct} inteiros) e
--    producao_prevista (informativa, alimenta o simulador).
-- 2. venda_futura_preco(lote, qtd, data): fonte da verdade do preço. Lote sem curva
--    devolve coalesce(valor, à vista), igual a hoje; com curva, faixa de volume ×
--    (1 − degrau vigente), em centavos half-up, nunca acima do à vista. Réplica em
--    src/lib/venda-futura/preco-curva.ts (mesmas fixtures).
-- 3. checkout_criar_pedido recriado a partir da 0207 (vigente, conferida em prod em
--    09/10 sem diferença), trocando só o preço do item de venda futura.
--
-- ponytail: recusa de lote com mínimo de reservas fica para o M2, quando a coluna existir.

alter table public.vendas_futuras
  add column if not exists curva jsonb not null default '[]'::jsonb,
  add column if not exists producao_prevista int check (producao_prevista is null or producao_prevista > 0);

comment on column public.vendas_futuras.curva is
  'PRD 061: até 3 degraus {dias_antes, desconto_pct} (inteiros). Vazio = preço fixo do lote (comportamento antigo).';

create or replace function public.vendas_futuras_curva_valida()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  d jsonb;
  v_ant_dias int;
  v_ant_pct int;
begin
  if jsonb_typeof(new.curva) <> 'array' then
    raise exception 'A curva precisa ser uma lista de degraus.';
  end if;
  if jsonb_array_length(new.curva) > 3 then
    raise exception 'A curva aceita no máximo 3 degraus.';
  end if;
  for d in select e from jsonb_array_elements(new.curva) e order by (e->>'dias_antes')::numeric desc loop
    if jsonb_typeof(d->'dias_antes') <> 'number' or (d->>'dias_antes')::numeric <> trunc((d->>'dias_antes')::numeric)
       or (d->>'dias_antes')::int <= 0 then
      raise exception 'Os dias de cada degrau precisam ser um número inteiro maior que zero.';
    end if;
    if jsonb_typeof(d->'desconto_pct') <> 'number' or (d->>'desconto_pct')::numeric <> trunc((d->>'desconto_pct')::numeric)
       or (d->>'desconto_pct')::int not between 1 and 90 then
      raise exception 'O desconto de cada degrau precisa ser um número inteiro de 1 a 90%%.';
    end if;
    if v_ant_dias is not null then
      if (d->>'dias_antes')::int = v_ant_dias then
        raise exception 'Há degraus com dias repetidos.';
      end if;
      if (d->>'desconto_pct')::int > v_ant_pct then
        raise exception 'O degrau mais distante da entrega precisa ter desconto maior ou igual ao seguinte.';
      end if;
    end if;
    v_ant_dias := (d->>'dias_antes')::int;
    v_ant_pct := (d->>'desconto_pct')::int;
  end loop;
  return new;
end;
$$;

drop trigger if exists vendas_futuras_curva_valida on public.vendas_futuras;
create trigger vendas_futuras_curva_valida
  before insert or update of curva on public.vendas_futuras
  for each row execute function public.vendas_futuras_curva_valida();

create or replace function public.venda_futura_preco(
  p_vf uuid,
  p_qtd int,
  p_data date default (now() at time zone 'America/Manaus')::date
)
returns numeric
language sql
stable
set search_path = public
as $$
  select case
    when jsonb_array_length(vf.curva) = 0 then coalesce(vf.valor, p.valor)
    else least(
      round(round(
        round(preco_faixa(p.id, p_qtd, p.valor) * 100)
        * (100 - coalesce((
            select (d->>'desconto_pct')::int
            from jsonb_array_elements(vf.curva) d
            where vf.previsao is not null
              and (d->>'dias_antes')::int <= vf.previsao - p_data
            order by (d->>'dias_antes')::int desc
            limit 1
          ), 0)) / 100.0
      ) / 100, 2),
      p.valor
    )
  end
  from vendas_futuras vf
  join produtos p on p.id = vf.produto_id
  where vf.id = p_vf;
$$;

comment on function public.venda_futura_preco(uuid, int, date) is
  'PRD 061: preço unitário da venda futura (curva × faixa, teto no à vista). Réplica TS em src/lib/venda-futura/preco-curva.ts.';

-- ---------------------------------------------------------------- checkout
-- Base: 0207 (vigente). Mudanças marcadas com "0218".
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
      v_preco_unit := venda_futura_preco(v_vf_id, v_qtd); -- 0218: curva × faixa
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
      v_preco_unit := venda_futura_preco(v_vf_id, v_qtd); -- 0218: curva × faixa
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
