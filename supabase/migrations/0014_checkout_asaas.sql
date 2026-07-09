-- 0014: carrinho + checkout com Asaas.
--
-- FRETE — decisão documentada (2026-07-08): a fórmula REAL de produção é
-- ad valorem de 10% sobre o valor do item (6 dos 7 itens com frete no dump:
-- 3,30/33, 112,80/1128, 61,80/618, 87/870...). O campo AdValorem=32 das
-- FaixaDeCEP do Bubble NUNCA foi cobrado — as faixas funcionam como ÁREA DE
-- COBERTURA de entrega. Modelo aqui: faixa define cobertura + percentual
-- (seed 10) + kg_adicional (0 hoje, suporte mantido).
--
-- SEGURANÇA — o comprador não escreve em pedidos/linha_itens diretamente:
-- a RPC checkout_criar_pedido (SECURITY DEFINER) revalida TODOS os preços no
-- banco (nunca confia no carrinho do client), calcula frete e repasses
-- (5% plataforma + % do afiliado aprovado) e insere em transação única.
-- Campos Asaas do pedido são gravados só pelo service role (trigger 0012).

-- ============ Faixas de CEP (cobertura + taxa de frete) ============
create table if not exists public.faixas_cep (
  id           uuid primary key default gen_random_uuid(),
  cep_inicial  integer not null,
  cep_final    integer not null,
  percentual   numeric(5,2) not null default 10,  -- % sobre o valor dos itens
  kg_adicional numeric(10,2) not null default 0,  -- R$/kg (0 em produção)
  ativo        boolean not null default true,
  check (cep_final >= cep_inicial)
);

alter table public.faixas_cep enable row level security;
create policy faixas_cep_read on public.faixas_cep for select using (true);
-- escrita: nenhuma policy → só admin painel futuro/service role.

insert into public.faixas_cep (cep_inicial, cep_final) values
  (69918070, 69918084), (69918090, 69918117), (69918160, 69918220),
  (69918480, 69918506), (69918120, 69918148), (69918410, 69918452),
  (69918460, 69918466), (69918340, 69918452), (69918240, 69918404),
  (69918510, 69918520), (69000000, 69099999), (69900000, 69999999),
  (70000000, 73699999)
on conflict do nothing;

-- ============ Cliente Asaas por usuário ============
create table if not exists public.asaas_clientes (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  customer_id text not null,
  cpf_cnpj    text not null,
  created_at  timestamptz not null default now()
);
alter table public.asaas_clientes enable row level security;
create policy asaas_clientes_self on public.asaas_clientes for select
  using (user_id = auth.uid());
-- insert/update só via service role (o server action usa a chave de serviço).

-- ============ Comprador lê os próprios pedidos ============
create policy pedidos_cliente_read on public.pedidos for select
  using (cliente_id = auth.uid());
create policy linha_itens_cliente_read on public.linha_itens for select
  using (exists (select 1 from public.pedidos pe
                 where pe.id = pedido_id and pe.cliente_id = auth.uid()));

-- ============ RPC do checkout ============
-- itens: [{"produto_id": uuid, "quantidade": int}]
-- entrega: {"tipo": "retirada"} ou
--          {"tipo": "entrega", "cep": "69000000", "rua": ..., "numero": ...,
--           "bairro": ..., "cidade": ..., "complemento": ...}
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
  v_qtd int;
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

  -- agrupa quantidades por produto_id: o client pode mandar o mesmo produto
  -- repetido no array, o que faria a validação de estoque (contra o valor
  -- original) passar mas o loop de insert decrementar múltiplas vezes.
  select jsonb_agg(jsonb_build_object('produto_id', produto_id, 'quantidade', qtd))
    into itens
  from (
    select (v->>'produto_id')::uuid as produto_id, sum((v->>'quantidade')::int) as qtd
    from jsonb_array_elements(itens) v
    group by 1
  ) s;

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
    if v_qtd > v_prod.estoque_atual then
      raise exception 'Estoque insuficiente de "%" (disponível: %).', v_prod.nome, v_prod.estoque_atual;
    end if;

    v_total_itens := v_total_itens + (v_prod.valor * v_qtd);
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
    v_valor_item := v_prod.valor * v_qtd;

    -- afiliado aprovado mais recente do produto (ou da loja), se houver
    select a.afiliado_id, a.porcentagem into v_afil
    from afiliacoes a
    where a.status = 'Aprovada'
      and (a.produto_id = v_prod.id or a.loja_id = v_loja)
    order by a.produto_id nulls last, a.created_at desc
    limit 1;

    insert into linha_itens (pedido_id, produto_id, produto_nome, quantidade,
      valor, repasse_ind, repasse_afiliado, afiliado_id,
      retirar_na_loja, valor_frete,
      entrega_cep, entrega_rua, entrega_numero, entrega_bairro,
      entrega_cidade, entrega_complemento)
    values (v_pedido, v_prod.id, v_prod.nome, v_qtd,
      v_valor_item,
      round(v_valor_item * 0.05, 2),                                   -- 5% plataforma
      case when v_afil.afiliado_id is null then 0
           else round(v_valor_item * v_afil.porcentagem / 100, 2) end,
      v_afil.afiliado_id,
      v_retirada,
      case when v_retirada then null
           else round(v_valor_item * v_percentual / 100, 2) end,
      case when v_retirada then null else entrega->>'cep' end,
      case when v_retirada then null else entrega->>'rua' end,
      case when v_retirada then null else entrega->>'numero' end,
      case when v_retirada then null else entrega->>'bairro' end,
      case when v_retirada then null else entrega->>'cidade' end,
      case when v_retirada then null else entrega->>'complemento' end);

    -- decremento atômico: evita estoque negativo em checkouts concorrentes
    update produtos set estoque_atual = estoque_atual - v_qtd
      where id = v_prod.id and estoque_atual >= v_qtd;
    if not found then
      raise exception 'Estoque insuficiente de "%".', v_prod.nome;
    end if;
  end loop;

  return v_pedido;
end;
$$;

-- executável só por usuário logado (a função já valida auth.uid())
revoke all on function public.checkout_criar_pedido(jsonb, jsonb, text) from public;
grant execute on function public.checkout_criar_pedido(jsonb, jsonb, text) to authenticated;
