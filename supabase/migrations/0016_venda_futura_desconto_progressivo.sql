-- Fidelidade ao industria24h.com.br (Bubble): "Venda Futura" tem preço próprio
-- por entrada (não só estoque+data) e "Promoções" (desconto progressivo) já
-- existe mas faltava (a) suportar múltiplas faixas por produto sem duplicar
-- linha e (b) o checkout NUNCA aplicava nenhum desconto (cobrava sempre
-- produtos.valor cheio, mesmo com faixa/reserva ativa).
--
-- NOTA: a branch fix/auditoria-2026-07-08 (concorrente, não mergeada em
-- master ainda) corrigiu o MESMO bug de desconto-no-checkout na sua própria
-- migration 0017. Esta migration cobre o mesmo caso (faixa progressiva) e
-- ADICIONA reserva de venda futura com preço próprio — quem mergear por
-- último deve conferir se não sobrou CREATE OR REPLACE redundante.

-- ============ 1. Preço por entrada de venda futura ============
alter table public.vendas_futuras
  add column if not exists valor numeric(12,2);

alter table public.vendas_futuras
  add constraint vendas_futuras_valor_check check (valor is null or valor > 0);

-- ============ 2. Uma linha por produto em promocoes_progressivas ============
-- Antes de constranger por unicidade, funde linhas duplicadas do mesmo
-- produto (faixas concatenadas) — o form antigo criava uma linha por
-- submissão em vez de acrescentar à faixa existente, o que quebraria
-- qualquer leitura por .maybeSingle() no front.
with fundidas as (
  select produto_id, jsonb_agg(elem order by (elem->>'min_qtd')::numeric) as faixas
  from public.promocoes_progressivas, jsonb_array_elements(faixas) as elem
  group by produto_id
), mantidas as (
  select min(id::text)::uuid as id, produto_id
  from public.promocoes_progressivas
  group by produto_id
)
update public.promocoes_progressivas pp
set faixas = f.faixas
from fundidas f, mantidas m
where pp.id = m.id and m.produto_id = f.produto_id;

with mantidas as (
  select min(id::text)::uuid as id, produto_id
  from public.promocoes_progressivas
  group by produto_id
)
delete from public.promocoes_progressivas pp
using mantidas m
where pp.produto_id = m.produto_id and pp.id <> m.id;

alter table public.promocoes_progressivas
  add constraint promocoes_progressivas_produto_unique unique (produto_id);

-- ============ 3. Preço vigente por faixa de quantidade ============
-- Cada elemento de `faixas` é {"min_qtd": n, "valor_unitario": v, "validade": "YYYY-MM-DD"|null}.
-- Retorna a valor_unitario da faixa de maior min_qtd aplicável (<=qtd) com
-- validade nula ou futura; se nenhuma faixa se aplica, devolve o preço base.
create or replace function public.preco_faixa(p_produto_id uuid, p_qtd int, p_base numeric)
returns numeric
language sql
stable
as $$
  select coalesce(
    (
      select (elem->>'valor_unitario')::numeric
      from public.promocoes_progressivas pp, jsonb_array_elements(pp.faixas) as elem
      where pp.produto_id = p_produto_id
        and pp.ativo
        and (elem->>'min_qtd')::numeric <= p_qtd
        and (elem->>'validade' is null or (elem->>'validade')::date >= current_date)
      order by (elem->>'min_qtd')::numeric desc
      limit 1
    ),
    p_base
  );
$$;

-- ============ 4. Linha de pedido pode vir de uma venda futura (reserva) ============
alter table public.linha_itens
  add column if not exists venda_futura_id uuid references public.vendas_futuras (id) on delete set null;

-- ============ 5. Checkout aplica desconto progressivo e reserva de venda futura ============
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

  -- valida itens contra o banco e trava a loja (carrinho é de UMA loja)
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
      and l.situacao = 'Ativa';
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
      -- reserva no mercado futuro: estoque e preço vêm da entrada de venda futura
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
