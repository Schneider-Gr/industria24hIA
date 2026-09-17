-- 0177: Reserva no pedido em vez de baixa anônima — Milestone 2 do PRD 036.
--
-- O problema, medido em produção em 16/09/2026: `checkout_criar_pedido`
-- decrementa `produtos.estoque_atual` na criação do pedido e **nada** devolve o
-- saldo quando o pedido não é pago. O único caminho de devolução é o webhook
-- do Asaas chamando `pedido_cancelar_devolver_estoque`, que depende de um evento
-- de vencimento que para PIX antigo nunca chegou. Resultado hoje:
--
--   80 pedidos em "Aguardando Pagamento" com item de produto
--   5.642 unidades travadas em 23 produtos
--   87 itens já vencidos pelo critério de 30 minutos do PRD
--   pedido mais antigo pendurado desde 2025-06-26
--
-- Essas unidades estão fora da vitrine sem venda correspondente. Não é dívida
-- técnica, é estoque vendável perdido.
--
-- DESENHO, e por que não é o do PRD ao pé da letra:
--
-- O PRD 036 descreve reserva como um livro novo, com saldo físico de um lado e
-- disponível do outro. Aqui `estoque_atual` **continua significando disponível**,
-- que é o que ele já significa hoje e o que as 124 referências do código leem
-- (vitrine, PDP, ruptura, cross-sell). Inverter isso faria toda vitrine passar a
-- exibir mercadoria reservada como disponível, ou seja, trocaria um vazamento de
-- saldo por oversell — que é o problema mais caro dos dois.
--
-- A leitura desta migration é outra: o decremento que já existe **já é** uma
-- reserva, só que anônima, sem prazo e sem dono. O que falta não é um número
-- novo, é o registro: de quem é, quando vence e o que aconteceu com ela. É isso
-- que `estoque_reservas` adiciona, sem tocar no significado do saldo.
--
-- Consequência que precisa estar escrita: como o físico e o disponível são o
-- mesmo número fora do galpão, a expedição não gera lançamento novo no ledger —
-- a saída já foi registrada quando a mercadoria deixou o pool vendável. O físico
-- como número separado existe dentro do CD, no saldo por endereço da 0176, que é
-- onde ele tem uso. O físico do seller segue derivável: disponível + reservas
-- ativas.
--
-- Divergência do critério de aceite do PRD que não dá para cumprir como escrito:
-- "checkout multi-loja que falha na segunda loja não deixa reserva ativa da
-- primeira, na mesma transação". Multi-loja no app é **uma chamada de RPC por
-- loja** (checkout/actions.ts:197, laço sobre `grupos`), em transações separadas
-- e sem rollback entre elas, por desenho. Não existe transação comum onde
-- liberar. Quem resolve é a expiração de 30 minutos, e é assim que o critério
-- passa a ser atendido: o pedido da primeira loja expira e devolve o saldo.

-- ============================================================
-- 1. Prazo da reserva
-- ============================================================

-- Função e não constante literal: os 30 minutos são premissa do PRD, e quando a
-- dona mudar de ideia o valor tem UM lugar para mudar, não vinte cópias dentro
-- de uma RPC recopiada.
create or replace function public.estoque_reserva_prazo()
returns interval
language sql
immutable
as $$ select interval '30 minutes' $$;

-- ============================================================
-- 2. O registro da reserva
-- ============================================================

create table if not exists public.estoque_reservas (
  id            uuid primary key default gen_random_uuid(),
  pedido_id     uuid not null references public.pedidos (id) on delete cascade,
  produto_id    uuid not null references public.produtos (id) on delete cascade,
  -- Venda futura tem estoque próprio (vendas_futuras.estoque) e o checkout
  -- decrementa esse, não o do produto. A reserva precisa saber de qual dos dois
  -- saiu para devolver ao lugar certo.
  venda_futura_id uuid references public.vendas_futuras (id) on delete set null,
  quantidade    int  not null,
  status        text not null default 'ativa',
  -- Nulo depois de confirmada: pedido pago não expira mais.
  expira_em     timestamptz,
  motivo        text,
  criado_em     timestamptz not null default clock_timestamp(),
  resolvido_em  timestamptz,

  constraint estoque_reservas_quantidade_positiva check (quantidade > 0),
  constraint estoque_reservas_status_valido
    check (status in ('ativa', 'confirmada', 'consumida', 'liberada')),
  -- Reserva resolvida diz por quê. É a mesma exigência do ledger (0175): sem
  -- motivo não há como explicar ao seller por que o saldo se moveu.
  constraint estoque_reservas_resolvida_tem_motivo
    check (status in ('ativa', 'confirmada') or btrim(coalesce(motivo, '')) <> ''),
  constraint estoque_reservas_ativa_tem_prazo
    check (status <> 'ativa' or expira_em is not null)
);

create index if not exists estoque_reservas_pedido_idx
  on public.estoque_reservas (pedido_id);

-- O índice que a expiração usa: só as ativas interessam, e são poucas.
create index if not exists estoque_reservas_vencendo_idx
  on public.estoque_reservas (expira_em)
  where status = 'ativa';

create index if not exists estoque_reservas_produto_ativa_idx
  on public.estoque_reservas (produto_id)
  where status in ('ativa', 'confirmada');

-- ============================================================
-- 3. Backfill: as reservas que já existem de fato
-- ============================================================
-- Os 80 pedidos pendurados já consumiram saldo; sem registrá-los como reserva,
-- a expiração não os conheceria e as 5.642 unidades ficariam presas para sempre.
-- Pedido pago ou enviado entra como consumido, não como ativo, para que a
-- expiração nunca devolva saldo de mercadoria que já saiu.

insert into public.estoque_reservas
  (pedido_id, produto_id, venda_futura_id, quantidade, status, expira_em, motivo,
   criado_em, resolvido_em)
select li.pedido_id,
       li.produto_id,
       li.venda_futura_id,
       li.quantidade,
       case p.status_pedido
         when 'Aguardando Pagamento' then 'ativa'
         when 'Cancelado'            then 'liberada'
         when 'Enviado'              then 'consumida'
         else 'confirmada'
       end,
       case when p.status_pedido = 'Aguardando Pagamento'
            then p.created_at + public.estoque_reserva_prazo()
       end,
       case p.status_pedido
         when 'Aguardando Pagamento' then null
         when 'Cancelado'            then 'Pedido já cancelado antes da 0177'
         when 'Enviado'              then 'Pedido já expedido antes da 0177'
         else 'Pedido já pago antes da 0177'
       end,
       p.created_at,
       case when p.status_pedido = 'Aguardando Pagamento' then null else now() end
  from public.linha_itens li
  join public.pedidos p on p.id = li.pedido_id
 where li.produto_id is not null
   and li.quantidade > 0
   -- Pedido cancelado já teve o saldo devolvido pelo caminho antigo; registrar a
   -- reserva como liberada é só história, e é o que impede uma segunda devolução.
   and not exists (
     select 1 from public.estoque_reservas r where r.pedido_id = li.pedido_id
   );

-- ============================================================
-- 4. Devolução de saldo, agora idempotente e ciente de venda futura
-- ============================================================
-- A versão vigente em produção tem dois defeitos que esta substitui:
--
-- (a) não é idempotente: dois caminhos chamando (pedido_cancelar e o webhook do
--     Asaas, ou o mesmo webhook reentregue) devolvem o saldo duas vezes e criam
--     estoque do nada;
-- (b) ignora venda futura: o checkout decrementa vendas_futuras.estoque e NADA
--     no banco devolve. Confirmado: `checkout_criar_pedido` é a única função que
--     escreve nessa coluna. Hoje não se materializou (zero itens de venda futura
--     em pedido cancelado), então esta correção chega antes do prejuízo.
--
-- A reserva é o que dá idempotência: só devolve o que ainda está ativa ou
-- confirmada, e marca como liberada na mesma transação.
create or replace function public.pedido_restaurar_estoque(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_motivo text := 'Devolução ao saldo por cancelamento do pedido';
begin
  -- Produto: soma por produto, para pedido com o mesmo produto em duas linhas.
  update public.produtos p
     set estoque_atual = p.estoque_atual + r.qtd
    from (
      select produto_id, sum(quantidade) as qtd
        from public.estoque_reservas
       where pedido_id = p_pedido_id
         and venda_futura_id is null
         and status in ('ativa', 'confirmada')
       group by produto_id
    ) r
   where p.id = r.produto_id;

  -- Venda futura: estoque próprio, devolvido ao lugar certo.
  update public.vendas_futuras vf
     set estoque = vf.estoque + r.qtd
    from (
      select venda_futura_id, sum(quantidade) as qtd
        from public.estoque_reservas
       where pedido_id = p_pedido_id
         and venda_futura_id is not null
         and status in ('ativa', 'confirmada')
       group by venda_futura_id
    ) r
   where vf.id = r.venda_futura_id;

  update public.estoque_reservas
     set status = 'liberada',
         motivo = coalesce(motivo, v_motivo),
         expira_em = null,
         resolvido_em = now()
   where pedido_id = p_pedido_id
     and status in ('ativa', 'confirmada');
end;
$$;

-- ============================================================
-- 5. Expiração
-- ============================================================
-- Expira por PEDIDO, não por item: não existe cancelar metade de um pedido, e
-- devolver o saldo de um item deixando o pedido de pé venderia o que o comprador
-- pensa que comprou.
--
-- p_produto_id restringe ao produto que alguém está tentando comprar agora, que
-- é o caso que importa para não recusar venda com saldo travado. Nulo expira
-- tudo, para o cron.
create or replace function public.estoque_reservas_expirar(p_produto_id uuid default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido uuid;
  v_n int := 0;
begin
  for v_pedido in
    select distinct r.pedido_id
      from public.estoque_reservas r
      join public.pedidos p on p.id = r.pedido_id
     where r.status = 'ativa'
       and r.expira_em <= now()
       and p.status_pedido = 'Aguardando Pagamento'
       and (p_produto_id is null or r.produto_id = p_produto_id)
  loop
    -- Devolve o saldo de TODAS as reservas do pedido, inclusive de produtos que
    -- não são o consultado: o pedido inteiro está sendo cancelado.
    perform public.pedido_restaurar_estoque(v_pedido);

    update public.estoque_reservas
       set motivo = 'Reserva expirada sem pagamento'
     where pedido_id = v_pedido
       and status = 'liberada'
       and resolvido_em >= now() - interval '1 minute';

    perform public.cupom_liberar_uso_pedido(v_pedido);
    update public.pedidos set status_pedido = 'Cancelado' where id = v_pedido;

    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

revoke all on function public.estoque_reservas_expirar(uuid) from public;
grant execute on function public.estoque_reservas_expirar(uuid) to authenticated, service_role;

-- ============================================================
-- 6. Ciclo da reserva colado no status do pedido
-- ============================================================
-- Trigger, e não chamada no código da aplicação: o status do pedido muda pelo
-- webhook do Asaas, pelo painel do seller, pelo admin e por SQL de operação.
-- Colar o ciclo da reserva em um desses caminhos deixaria os outros três
-- devolvendo ou consumindo saldo errado.
create or replace function public.pedido_reservas_pelo_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status_pedido = old.status_pedido then
    return new;
  end if;

  if new.status_pedido = 'Cancelado' then
    -- Idempotente: quem já chamou pedido_restaurar_estoque antes do update (é o
    -- que pedido_cancelar e o webhook fazem) não devolve nada de novo aqui.
    perform public.pedido_restaurar_estoque(new.id);

  elsif new.status_pedido = 'Pagamento Realizado' then
    update public.estoque_reservas
       set status = 'confirmada', expira_em = null
     where pedido_id = new.id and status = 'ativa';

    -- Pagamento que chega depois da reserva ter expirado e o saldo já ter sido
    -- vendido: não force baixa nem ressuscite o saldo. Registre, porque isso é
    -- reembolso a decidir pela operação, não caso a resolver no gatilho.
    if not exists (
      select 1 from public.estoque_reservas
       where pedido_id = new.id and status in ('ativa', 'confirmada')
    ) and exists (
      select 1 from public.estoque_reservas
       where pedido_id = new.id and status = 'liberada'
         and motivo = 'Reserva expirada sem pagamento'
    ) then
      insert into public.auditoria_eventos
        (ator_id, ator_papel, acao, tabela, registro_id, dados_antes, dados_depois)
      values (null, 'sistema', 'pedido.pago_sem_reserva', 'pedidos', new.id,
              jsonb_build_object('status_pedido', old.status_pedido),
              jsonb_build_object('status_pedido', new.status_pedido,
                                 'pendencia', 'reserva expirada antes do pagamento'));
    end if;

  elsif new.status_pedido = 'Enviado' then
    -- Expedição é o que consome a reserva. O saldo disponível já havia caído na
    -- criação do pedido, então aqui não há número a mexer: o que muda é o
    -- estado, e é ele que impede a devolução depois da mercadoria ter saído.
    update public.estoque_reservas
       set status = 'consumida',
           motivo = coalesce(motivo, 'Pedido expedido'),
           expira_em = null,
           resolvido_em = now()
     where pedido_id = new.id and status in ('ativa', 'confirmada');
  end if;

  return new;
end;
$$;

drop trigger if exists pedidos_reservas_pelo_status on public.pedidos;
create trigger pedidos_reservas_pelo_status
  after update of status_pedido on public.pedidos
  for each row
  when (old.status_pedido is distinct from new.status_pedido)
  execute function public.pedido_reservas_pelo_status();

-- Expedir pedido cuja reserva foi liberada por engano é bloqueado, com o motivo
-- registrado na mensagem. Sem isto, a operação separa e despacha mercadoria que
-- o sistema já devolveu ao saldo e vendeu de novo.
create or replace function public.pedido_guarda_expedicao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_motivo text;
begin
  if new.status_pedido <> 'Enviado' or old.status_pedido = 'Enviado' then
    return new;
  end if;

  if exists (
    select 1 from public.estoque_reservas
     where pedido_id = new.id and status in ('ativa', 'confirmada')
  ) then
    return new;
  end if;

  select motivo into v_motivo
    from public.estoque_reservas
   where pedido_id = new.id and status = 'liberada'
   order by resolvido_em desc nulls last
   limit 1;

  if v_motivo is not null then
    raise exception 'Pedido % não pode ser expedido: a reserva de estoque foi liberada (%).', new.id, v_motivo;
  end if;

  return new;
end;
$$;

drop trigger if exists pedidos_guarda_expedicao on public.pedidos;
create trigger pedidos_guarda_expedicao
  before update of status_pedido on public.pedidos
  for each row
  when (old.status_pedido is distinct from new.status_pedido)
  execute function public.pedido_guarda_expedicao();

-- ============================================================
-- 7. RLS — leitura para quem tem o que perder
-- ============================================================

alter table public.estoque_reservas enable row level security;

drop policy if exists estoque_reservas_leitura_seller on public.estoque_reservas;
create policy estoque_reservas_leitura_seller
  on public.estoque_reservas for select
  to authenticated
  using (
    exists (
      select 1 from public.produtos p
        join public.lojas l on l.id = p.loja_id
       where p.id = estoque_reservas.produto_id
         and l.owner_id = auth.uid()
    )
  );

drop policy if exists estoque_reservas_leitura_comprador on public.estoque_reservas;
create policy estoque_reservas_leitura_comprador
  on public.estoque_reservas for select
  to authenticated
  using (
    exists (
      select 1 from public.pedidos pe
       where pe.id = estoque_reservas.pedido_id
         and pe.cliente_id = auth.uid()
    )
  );

-- Sem policy de escrita: reserva nasce e morre dentro das funções acima.

-- ============================================================
-- 8. checkout_criar_pedido
-- ============================================================
-- Abaixo, a definição VIGENTE em produção (extraída por pg_get_functiondef em
-- 16/09/2026, overload de 3 argumentos, o único com corpo real — os de 4, 5 e 6
-- argumentos delegam nele) com exatamente duas inserções: a expiração antes da
-- checagem de saldo e o registro da reserva depois do decremento. Nenhuma outra
-- linha foi tocada, e o arquivo foi gerado por script a partir do banco em vez
-- de transcrito, porque transcrever 373 linhas do caminho do dinheiro à mão é
-- como se introduz regressão silenciosa.

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
    select p.id, p.nome, p.valor, p.categoria_id, p.loja_id into v_prod
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

    v_repasse_ind := round(v_valor_item * 0.05, 2);

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
      valor, repasse_ind, repasse_afiliado, afiliado_id, venda_futura_id,
      retirar_na_loja, valor_frete, transportadora_id,
      cupom_id, desconto_cupom,
      entrega_cep, entrega_rua, entrega_numero, entrega_bairro,
      entrega_cidade, entrega_complemento)
    values (v_pedido, v_prod.id, v_prod.nome, v_qtd,
      v_valor_item,
      v_repasse_ind,
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
