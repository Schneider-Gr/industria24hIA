-- 0074: consolidação de carga por rota (MPDD-46, PRD Confluence 6225921).
--
-- Pedidos de compradores diferentes com destino no mesmo corredor de CEP
-- compartilham um veículo: o comprador opta no checkout por "frete
-- consolidado" (30% de desconto, sai na próxima janela) e o admin monta o
-- lote manualmente (v1 manual-assistida) — o lote vira UMA corrida única
-- (manifesto) no motor existente de corridas (0039/0043): mesmo feed,
-- aceite, exclusividade de afiliado e transições de status.
--
-- Decisões fechadas com o dono (23/07/2026):
--   * desconto do consolidado = 30% sobre o valor_frete da faixa;
--   * v1: lote = MESMA loja (1 coleta) + mesmo corredor (prefixo 3 dígitos
--     do CEP de destino); multi-loja fica para v2;
--   * transportador recebe a SOMA dos fretes já descontados — mesmo modelo
--     do despacho automático (plataforma repassa 100% do frete, sem margem
--     na v1). ponytail: margem da plataforma entra quando houver histórico
--     de custo real por corredor.

-- ============ 1. Flag no pedido ============
alter table public.pedidos
  add column if not exists frete_consolidado boolean not null default false;

-- ============ 2. Lotes ============
create table if not exists public.lotes_consolidacao (
  id           uuid primary key default gen_random_uuid(),
  loja_id      uuid not null references public.lojas (id),
  corredor_cep text not null,                 -- prefixo de 3 dígitos do destino
  corrida_id   uuid references public.corridas (id),
  status       text not null default 'Publicado'
               check (status in ('Publicado', 'Concluido', 'Cancelado')),
  criado_por   uuid references auth.users (id),
  criado_em    timestamptz not null default now()
);
alter table public.lotes_consolidacao enable row level security;
create policy lotes_admin_all on public.lotes_consolidacao
  for all using (public.is_admin()) with check (public.is_admin());
-- transportador responsável pela corrida do lote lê o lote (manifesto):
create policy lotes_transportador_read on public.lotes_consolidacao
  for select using (
    exists (select 1 from corridas c
            where c.id = lotes_consolidacao.corrida_id
              and (c.afiliado_exclusivo_id = auth.uid()
                   or exists (select 1 from parceiros_logisticos p
                              where p.id = c.parceiro_id and p.user_id = auth.uid())))
  );

create table if not exists public.lote_pedidos (
  lote_id       uuid not null references public.lotes_consolidacao (id) on delete cascade,
  pedido_id     uuid not null unique references public.pedidos (id),
  frete_rateado numeric(12,2) not null default 0, -- frete consolidado cobrado deste pedido
  primary key (lote_id, pedido_id)
);
alter table public.lote_pedidos enable row level security;
create policy lote_pedidos_admin_all on public.lote_pedidos
  for all using (public.is_admin()) with check (public.is_admin());
create policy lote_pedidos_transportador_read on public.lote_pedidos
  for select using (
    exists (select 1 from lotes_consolidacao l
            join corridas c on c.id = l.corrida_id
            where l.id = lote_pedidos.lote_id
              and (c.afiliado_exclusivo_id = auth.uid()
                   or exists (select 1 from parceiros_logisticos p
                              where p.id = c.parceiro_id and p.user_id = auth.uid())))
  );

-- ============ 3. Checkout: wrapper de 5 argumentos ============
-- Mesmo padrão da 0065 (ref de afiliado): reaproveita a versão anterior e
-- aplica o desconto por cima, dentro da mesma transação — a cobrança Asaas
-- é criada depois, já com o valor_pedido descontado.
create or replace function public.checkout_criar_pedido(
  itens jsonb,
  entrega jsonb,
  forma_pagamento text,
  ref text default null,
  frete_consolidado boolean default false
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_pedido uuid;
  v_desconto numeric(12,2);
begin
  v_pedido := public.checkout_criar_pedido(itens, entrega, forma_pagamento, ref);

  -- só se aplica a entrega com frete cobrado (retirada na loja não tem frete)
  if not frete_consolidado then
    return v_pedido;
  end if;

  -- 30% de desconto no frete de cada linha (decisão 23/07/2026)
  with atualizadas as (
    update linha_itens
    set valor_frete = round(valor_frete * 0.70, 2)
    where pedido_id = v_pedido and coalesce(valor_frete, 0) > 0
    returning valor_frete / 0.70 - valor_frete as desconto
  )
  select coalesce(sum(desconto), 0) into v_desconto from atualizadas;

  if v_desconto > 0 then
    update pedidos
    set valor_pedido = round(valor_pedido - v_desconto, 2),
        frete_consolidado = true
    where id = v_pedido;
  end if;

  return v_pedido;
end;
$function$;

comment on function public.checkout_criar_pedido(jsonb, jsonb, text, text, boolean) is
  'Cria o pedido; frete_consolidado=true aplica 30% de desconto no frete e marca o pedido para aguardar lote de consolidação (0074).';

-- ============ 4. Despacho automático pula pedidos consolidados ============
-- Cópia da 0043 com um guard no início: pedido consolidado NÃO gera corrida
-- individual no pagamento — fica no pool aguardando o admin montar o lote.
create or replace function public.despachar_corrida_automatica(p_pedido_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_ja_existe uuid;
  v_pedido record;
  v_item record;
  v_loja record;
  v_afiliado uuid;
  v_id uuid;
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
         entrega_cidade, entrega_complemento, valor_frete
    into v_item
  from linha_itens
  where pedido_id = p_pedido_id and retirar_na_loja = false and entrega_cep is not null
  limit 1;
  if not found then
    return null; -- retirada na loja: sem corrida
  end if;

  select cep, rua, numero, cidade, estado into v_loja
  from lojas where id = v_pedido.loja_id;

  select afiliado_id into v_afiliado
  from afiliacoes
  where loja_id = v_pedido.loja_id and tipo = 'logistica' and status = 'Aprovada'
  order by created_at asc
  limit 1;

  insert into corridas (
    solicitante_id, pedido_id,
    origem_cep, origem_endereco,
    destino_cep, destino_endereco,
    peso_kg, modo, preco_sugerido, preco_final,
    janela_inicio, janela_fim,
    afiliado_exclusivo_id, exclusividade_fim
  )
  select
    pe.cliente_id, p_pedido_id,
    coalesce(v_loja.cep, ''), concat_ws(', ', v_loja.rua, v_loja.numero, v_loja.cidade, v_loja.estado, v_loja.cep),
    v_item.entrega_cep, concat_ws(', ', v_item.entrega_rua, v_item.entrega_numero, v_item.entrega_bairro, v_item.entrega_cidade, v_item.entrega_complemento),
    1, -- peso_kg placeholder: produtos não têm peso confiável hoje (só 89/358, ver rebuild); NOT NULL exige > 0
    'primeiro_aceita',
    v_item.valor_frete, v_item.valor_frete,
    now(), now() + interval '24 hours',
    v_afiliado, case when v_afiliado is not null then now() + interval '5 minutes' else null end
  from pedidos pe where pe.id = p_pedido_id
  returning id into v_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (null, 'sistema', 'corrida.despacho_automatico', 'corridas', v_id,
          jsonb_build_object('pedido_id', p_pedido_id, 'afiliado_exclusivo_id', v_afiliado));

  return v_id;
end; $$;
revoke all on function public.despachar_corrida_automatica(uuid) from public, anon;
grant execute on function public.despachar_corrida_automatica(uuid) to authenticated, service_role;

-- ============ 5. Montar lote (admin, v1 manual-assistida) ============
create or replace function public.criar_lote_consolidacao(p_pedido_ids uuid[])
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_loja_id uuid;
  v_corredor text;
  v_loja record;
  v_afiliado uuid;
  v_frete_total numeric(12,2) := 0;
  v_qtd int;
  v_corrida uuid;
  v_lote uuid;
  v_destinos text;
begin
  if not public.is_admin() then
    raise exception 'Apenas admin monta lotes de consolidação.';
  end if;
  if p_pedido_ids is null or array_length(p_pedido_ids, 1) < 2 then
    raise exception 'Um lote precisa de pelo menos 2 pedidos.';
  end if;

  -- valida o conjunto: pagos, consolidados, mesma loja, sem corrida/lote
  select count(*), min(pe.loja_id::text)::uuid
    into v_qtd, v_loja_id
  from pedidos pe
  where pe.id = any (p_pedido_ids)
    and pe.status_pedido = 'Pagamento Realizado'
    and pe.frete_consolidado
    and not exists (select 1 from corridas c where c.pedido_id = pe.id)
    and not exists (select 1 from lote_pedidos lp where lp.pedido_id = pe.id);
  if v_qtd <> array_length(p_pedido_ids, 1) then
    raise exception 'Todos os pedidos devem estar pagos, marcados como frete consolidado e fora de outro lote/corrida.';
  end if;
  if exists (select 1 from pedidos where id = any (p_pedido_ids) and loja_id <> v_loja_id) then
    raise exception 'V1: todos os pedidos do lote devem ser da mesma loja (uma coleta).';
  end if;

  -- corredor = prefixo de 3 dígitos do CEP de destino, igual em todos
  select left(min(li.entrega_cep), 3) into v_corredor
  from linha_itens li
  where li.pedido_id = any (p_pedido_ids) and li.entrega_cep is not null;
  if exists (
    select 1 from linha_itens li
    where li.pedido_id = any (p_pedido_ids) and li.entrega_cep is not null
      and left(li.entrega_cep, 3) <> v_corredor
  ) then
    raise exception 'Todos os destinos devem estar no mesmo corredor (prefixo % do CEP).', v_corredor;
  end if;
  select sum(coalesce(li.valor_frete, 0)),
         string_agg(concat_ws(', ', li.entrega_rua, li.entrega_numero, li.entrega_bairro, li.entrega_cidade, li.entrega_cep), ' | ')
    into v_frete_total, v_destinos
  from linha_itens li
  where li.pedido_id = any (p_pedido_ids)
    and li.retirar_na_loja = false and li.entrega_cep is not null;
  if coalesce(v_frete_total, 0) <= 0 then
    raise exception 'Lote sem frete a pagar — pedidos são de retirada na loja?';
  end if;

  select cep, rua, numero, cidade, estado into v_loja from lojas where id = v_loja_id;

  select afiliado_id into v_afiliado
  from afiliacoes
  where loja_id = v_loja_id and tipo = 'logistica' and status = 'Aprovada'
  order by created_at asc limit 1;

  -- corrida única (manifesto): preco = soma dos fretes consolidados cobrados
  insert into corridas (
    solicitante_id, origem_cep, origem_endereco,
    destino_cep, destino_endereco, descricao_carga,
    peso_kg, modo, preco_sugerido, preco_final,
    janela_inicio, janela_fim,
    afiliado_exclusivo_id, exclusividade_fim
  ) values (
    auth.uid(), coalesce(v_loja.cep, ''),
    concat_ws(', ', v_loja.rua, v_loja.numero, v_loja.cidade, v_loja.estado, v_loja.cep),
    v_corredor || '00000',
    v_destinos,
    format('Lote consolidado: %s entregas no corredor %sxx-xxx', v_qtd, v_corredor),
    v_qtd, -- ponytail: peso placeholder 1/pedido, igual à 0043; peso real quando o cadastro tiver
    'primeiro_aceita', v_frete_total, v_frete_total,
    now(), now() + interval '24 hours',
    v_afiliado, case when v_afiliado is not null then now() + interval '5 minutes' else null end
  ) returning id into v_corrida;

  insert into lotes_consolidacao (loja_id, corredor_cep, corrida_id, criado_por)
  values (v_loja_id, v_corredor, v_corrida, auth.uid())
  returning id into v_lote;

  insert into lote_pedidos (lote_id, pedido_id, frete_rateado)
  select v_lote, pe.id,
         (select coalesce(sum(li.valor_frete), 0) from linha_itens li where li.pedido_id = pe.id)
  from pedidos pe where pe.id = any (p_pedido_ids);

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (auth.uid(), 'admin', 'lote.criado', 'lotes_consolidacao', v_lote,
          jsonb_build_object('pedidos', p_pedido_ids, 'corrida_id', v_corrida,
                             'frete_total', v_frete_total, 'corredor', v_corredor));

  return v_lote;
end; $$;
revoke all on function public.criar_lote_consolidacao(uuid[]) from public, anon;
grant execute on function public.criar_lote_consolidacao(uuid[]) to authenticated;
