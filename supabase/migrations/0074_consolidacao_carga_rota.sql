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
-- SEM defaults de propósito: com default, qualquer chamada com menos args
-- fica ambígua (42725, pego no teste E2E). Isso inclui um BUG LATENTE da
-- 0065 em produção: `ref text default null` torna a chamada interna de
-- 3 args ambígua — todo checkout que passa pela 4-args quebra (é por isso
-- que o teste ?ref= da fila nunca passou). Fix: recriar a 4-args sem
-- default (drop+create: replace não remove default). Chamadas nomeadas do
-- PostgREST (actions.ts sempre envia `ref`) continuam casando normalmente.
drop function if exists public.checkout_criar_pedido(jsonb, jsonb, text, text);
create function public.checkout_criar_pedido(
  itens jsonb,
  entrega jsonb,
  forma_pagamento text,
  ref text
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_pedido uuid;
  v_ref text := nullif(trim(ref), '');
begin
  -- Reaproveita toda a lógica já validada da versão de 3 argumentos.
  v_pedido := public.checkout_criar_pedido(itens, entrega, forma_pagamento);

  if v_ref is null then
    return v_pedido;
  end if;

  -- Reatribui apenas os itens cujo produto/loja é coberto pela afiliação do
  -- link, recalculando o repasse com a porcentagem dela (0065).
  update linha_itens li
  set afiliado_id = a.afiliado_id,
      repasse_afiliado = round(li.valor * a.porcentagem / 100, 2)
  from afiliacoes a, produtos p
  where li.pedido_id = v_pedido
    and p.id = li.produto_id
    and a.identificador = v_ref
    and a.status = 'Aprovada'
    and (a.produto_id = li.produto_id or a.loja_id = p.loja_id);

  return v_pedido;
end;
$function$;
revoke all on function public.checkout_criar_pedido(jsonb, jsonb, text, text) from public, anon;
grant execute on function public.checkout_criar_pedido(jsonb, jsonb, text, text) to authenticated;

create or replace function public.checkout_criar_pedido(
  itens jsonb,
  entrega jsonb,
  forma_pagamento text,
  ref text,
  frete_consolidado boolean
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

  -- 30% de desconto no frete de cada linha (decisão 23/07/2026).
  -- Desconto calculado ANTES do update (old - round(old*0.7)) para o abate no
  -- valor_pedido bater centavo a centavo com a soma das linhas.
  select coalesce(sum(valor_frete - round(valor_frete * 0.70, 2)), 0)
    into v_desconto
  from linha_itens
  where pedido_id = v_pedido and coalesce(valor_frete, 0) > 0;

  update linha_itens
  set valor_frete = round(valor_frete * 0.70, 2)
  where pedido_id = v_pedido and coalesce(valor_frete, 0) > 0;

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
-- Base = 0048 (última versão, com janela de 4h) + dois ajustes:
--   a) guard: pedido consolidado NÃO gera corrida individual no pagamento —
--      fica no pool aguardando o admin montar o lote;
--   b) FIX pré-existente: o preço da corrida era o valor_frete de UMA linha
--      (limit 1) — pedido multi-item pagava frete somado mas o transportador
--      recebia o de uma linha só (e com frete_gratis da 0054 a linha sorteada
--      podia ser a de frete 0). Agora preco = SUM(valor_frete) do pedido.
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
    v_frete_total, v_frete_total,
    now(), now() + interval '4 hours', -- janela da 0048 (4h pro parceiro coletar)
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

-- ============ 6. Desfazer lote (admin) ============
-- Sem isto, uma corrida cancelada deixaria os pedidos presos no lote para
-- sempre (lote_pedidos.pedido_id é unique). Cancela a corrida (se ainda não
-- coletada), libera os pedidos e marca o lote Cancelado.
create or replace function public.cancelar_lote_consolidacao(p_lote_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_lote record;
  v_corrida record;
begin
  if not public.is_admin() then
    raise exception 'Apenas admin cancela lotes.';
  end if;

  select * into v_lote from lotes_consolidacao where id = p_lote_id for update;
  if not found then raise exception 'Lote não encontrado.'; end if;
  if v_lote.status <> 'Publicado' then raise exception 'Lote já % — nada a cancelar.', lower(v_lote.status); end if;

  if v_lote.corrida_id is not null then
    select * into v_corrida from corridas where id = v_lote.corrida_id for update;
    if v_corrida.status not in ('Publicada', 'Aceita') then
      raise exception 'Corrida do lote já em andamento (%) — não dá para cancelar.', v_corrida.status;
    end if;
    update corridas set status = 'Cancelada' where id = v_lote.corrida_id;
  end if;

  delete from lote_pedidos where lote_id = p_lote_id; -- libera os pedidos para novo lote
  update lotes_consolidacao set status = 'Cancelado' where id = p_lote_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_antes)
  values (auth.uid(), 'admin', 'lote.cancelado', 'lotes_consolidacao', p_lote_id,
          jsonb_build_object('corrida_id', v_lote.corrida_id));
end; $$;
revoke all on function public.cancelar_lote_consolidacao(uuid) from public, anon;
grant execute on function public.cancelar_lote_consolidacao(uuid) to authenticated;

-- ============ 7. Guard financeiro honra app.checkout_rpc na transacao toda ============
-- O guard (0038) so liberava a flag no INSERT de linha_itens. O UPDATE de
-- repasse_afiliado da 0065 e o desconto do consolidado (acima) precisam da
-- mesma liberacao; a flag so e setada por RPCs security definer e morre no
-- fim da transacao, entao o early-return nao abre brecha fora do checkout.
create or replace function public.guard_campos_restritos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role/postgres (auth.uid() null) e admins passam.
  if auth.uid() is null or public.is_admin() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  -- 0074: RPCs de checkout (security definer) sinalizam via app.checkout_rpc
  -- (set_config local a transacao, mesmo padrao da 0038 no INSERT de
  -- linha_itens). Estendido para toda a transacao de checkout: sem isto, o
  -- UPDATE de repasse_afiliado da 0065 (?ref=) e o desconto do frete
  -- consolidado (0074) morrem no guard.
  if coalesce(current_setting('app.checkout_rpc', true), '') = 'on' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;


  if tg_table_name = 'produtos' then
    if tg_op = 'INSERT' then
      if new.status_produto is distinct from 'Pendente' then
        raise exception 'Produto novo nasce Pendente; aprovação é do admin.';
      end if;
    elsif new.status_produto is distinct from old.status_produto then
      raise exception 'Apenas admin altera status_produto (moderação).';
    end if;

  elsif tg_table_name = 'lojas' then
    if tg_op = 'UPDATE' and new.situacao is distinct from old.situacao then
      raise exception 'Apenas admin altera a situação da loja (moderação).';
    end if;
    if tg_op = 'UPDATE'
       and (new.chave_pix is distinct from old.chave_pix
            or new.tipo_chave_pix is distinct from old.tipo_chave_pix)
       and coalesce(current_setting('app.chave_pix_rpc', true), '') <> 'on' then
      raise exception 'Troca de chave PIX só pela função alterar_chave_pix_loja.';
    end if;

  elsif tg_table_name = 'pedidos' then
    if tg_op = 'INSERT' then
      if new.repasse_ind24 is not null
        or new.valor_recebido_industria is not null
        or new.asaas_cobranca_id is not null
        or new.link_cobranca is not null
        or new.dt_pagamento is not null
      then
        raise exception 'Apenas admin define campos financeiros do pedido na criação.';
      end if;
    elsif tg_op = 'UPDATE' and (
         new.valor_pedido is distinct from old.valor_pedido
      or new.repasse_ind24 is distinct from old.repasse_ind24
      or new.valor_recebido_industria is distinct from old.valor_recebido_industria
      or new.asaas_cobranca_id is distinct from old.asaas_cobranca_id
      or new.link_cobranca is distinct from old.link_cobranca
      or new.dt_pagamento is distinct from old.dt_pagamento
    ) then
      raise exception 'Apenas admin altera campos financeiros do pedido.';
    elsif tg_op = 'DELETE' and (
      old.dt_pagamento is not null or old.valor_recebido_industria is not null
    ) then
      raise exception 'Apenas admin apaga pedido já pago.';
    end if;

  elsif tg_table_name = 'linha_itens' then
    if tg_op = 'INSERT' then
      -- checkout_criar_pedido (security definer) grava repasses na criação da
      -- linha em nome do comprador; sinaliza via app.checkout_rpc (mesmo
      -- padrão de app.chave_pix_rpc). 0031 assumiu errado que o checkout
      -- rodava como service_role e quebrou TODO checkout de comprador logado.
      if coalesce(current_setting('app.checkout_rpc', true), '') = 'on' then
        return new;
      end if;
      if new.pago is true
        or new.transferido is true
        or new.repasse_ind is not null
        or new.repasse_afiliado is not null
        or new.repasse_vendedor is not null
        or new.dt_pagamento_cliente is not null
      then
        raise exception 'Apenas admin define campos financeiros do item na criação.';
      end if;
    elsif tg_op = 'UPDATE' and (
         new.valor is distinct from old.valor
      or new.pago is distinct from old.pago
      or new.transferido is distinct from old.transferido
      or new.repasse_ind is distinct from old.repasse_ind
      or new.repasse_afiliado is distinct from old.repasse_afiliado
      or new.repasse_vendedor is distinct from old.repasse_vendedor
      or new.dt_pagamento_cliente is distinct from old.dt_pagamento_cliente
    ) then
      raise exception 'Apenas admin altera campos financeiros do item.';
    elsif tg_op = 'DELETE' and (old.pago is true or old.transferido is true) then
      raise exception 'Apenas admin apaga item já pago/transferido.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

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

