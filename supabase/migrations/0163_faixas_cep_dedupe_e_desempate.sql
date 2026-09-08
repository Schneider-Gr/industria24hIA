-- 0163: frete por faixa de CEP deixa de depender do plano de execucao.
--
-- Achado 2026-09-08: `faixas_cep` tem 39 linhas para 13 faixas de CEP. Cada
-- faixa aparece como DUAS linhas identicas de 8% da transportadora interna
-- 00000000-0000-4000-8000-000000000059 e UMA linha global de 10% sem
-- transportadora. Duas coisas diferentes, tratadas aqui separadamente:
--
--   1. As duas linhas identicas sao duplicata pura. Removidas, e um unique
--      index impede que voltem. Nenhum valor muda: sao iguais em todas as
--      colunas.
--
--   2. A linha de 8% (transportadora) e a de 10% (global) tem a MESMA
--      extensao de faixa, entao `order by (cep_final - cep_inicial) asc
--      limit 1` empata e o Postgres devolve qualquer uma. Duas funcoes nao
--      filtram por transportadora e por isso cobram 8% ou 10% pelo mesmo CEP
--      conforme o plano de execucao. `checkout_criar_pedido` nao esta nesse
--      grupo: ela ja casa `transportadora_id is not distinct from` a
--      transportadora escolhida.
--
-- Desempate adotado, por funcao:
--   `cotar_frete_interno`  -> prefere a faixa COM transportadora. E a cotacao
--      que devolve `transportadora_id` junto com o percentual; o checkout
--      depois usa essa mesma transportadora e cai na mesma linha. Preferir a
--      global aqui faria a cotacao (10%) divergir da cobranca (8%).
--   `coletiva_fechar`      -> prefere a faixa SEM transportadora. O fechamento
--      da coletiva nao seleciona transportadora nenhuma, entao a faixa global
--      e a que corresponde ao que sera cobrado.
--
-- Nenhuma das duas escolhas altera o valor em um CEP nao ambiguo; elas so
-- fixam qual linha vence quando ha empate, que hoje e sorteio.

begin;

-- 1. Duplicata exata (todas as colunas iguais, so o id difere).
delete from faixas_cep f
where f.ctid <> (
  select min(g.ctid)
  from faixas_cep g
  where g.cep_inicial     = f.cep_inicial
    and g.cep_final       = f.cep_final
    and g.percentual      = f.percentual
    and g.kg_adicional    is not distinct from f.kg_adicional
    and g.ativo           is not distinct from f.ativo
    and g.loja_id         is not distinct from f.loja_id
    and g.transportadora_id is not distinct from f.transportadora_id
);

-- 2. Uma faixa por (CEP inicial, CEP final, loja, transportadora).
--    `nulls not distinct` (PG 15+) e o que faz a regra valer para as faixas
--    globais, onde loja_id e transportadora_id sao null.
create unique index if not exists faixas_cep_faixa_unica
  on faixas_cep (cep_inicial, cep_final, loja_id, transportadora_id)
  nulls not distinct;

-- 3. Desempate deterministico na cotacao interna: faixa da transportadora
--    antes da global.
create or replace function public.cotar_frete_interno(p_loja_id uuid, p_cep integer)
returns table(transportadora_id uuid, percentual numeric)
language sql
stable security definer
set search_path to 'public'
as $function$
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
  order by (f.loja_id = p_loja_id) desc, (f.cep_final - f.cep_inicial) asc,
           (f.transportadora_id is null) asc
  limit 1;
$function$;

-- 4. Desempate deterministico no fechamento da coletiva: faixa global antes
--    da faixa de transportadora. Corpo copiado do banco (estado real em
--    2026-09-08); a unica mudanca e a linha do `order by`.

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
      v_valor, round(v_valor * 0.05, 2), 0,
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

commit;
