-- 0203: Entrega a combinar com o vendedor (PRD 050 M1, change
-- openspec/changes/entrega-a-combinar-cotacao).
--
-- O seller marca "Frete a combinar" no produto (só em loja com a flag que o
-- admin liga). Marcado, o produto perde todo outro frete: o checkout só cria
-- pedido com entrega desse produto a partir de uma cotação respondida pelo
-- seller, gravada aqui, presa ao comprador, loja, CEP, itens e quantidades.
-- O valor nunca vem do navegador (mesmo molde de cotacoes_frete_externo, 0139).

-- ---------------------------------------------------------------- colunas
alter table public.lojas
  add column if not exists entrega_a_combinar boolean not null default false;

alter table public.produtos
  add column if not exists frete_a_combinar boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'produtos_frete_a_combinar_sem_gratis') then
    alter table public.produtos
      add constraint produtos_frete_a_combinar_sem_gratis
      check (not (frete_a_combinar and frete_gratis));
  end if;
end $$;

-- ---------------------------------------------------------------- tabela
create table if not exists public.cotacoes_frete_vendedor (
  id                       uuid primary key default gen_random_uuid(),
  loja_id                  uuid not null references public.lojas (id) on delete cascade,
  comprador_id             uuid not null references auth.users (id) on delete cascade,
  produto_id               uuid references public.produtos (id) on delete set null,
  cep_destino              char(8) not null check (cep_destino ~ '^\d{8}$'),
  bairro_destino           text,
  cidade_destino           text,
  uf_destino               char(2),
  cep_origem               char(8),
  itens                    jsonb not null,
  itens_chave              text not null,
  itens_carrinho           jsonb,
  observacao               varchar(500),
  telefone_comprador       text,
  status                   text not null default 'aguardando'
                           check (status in ('aguardando', 'respondida', 'recusada', 'expirada',
                                             'substituida', 'cancelada', 'usada')),
  responder_ate            timestamptz not null,
  lembrete_em              timestamptz,
  aviso_expiracao_em       timestamptz,
  valor_centavos           integer check (valor_centavos >= 0),
  valor_carrinho_centavos  integer check (valor_carrinho_centavos >= 0),
  prazo_min                smallint check (prazo_min between 1 and 60),
  prazo_max                smallint check (prazo_max between 1 and 60),
  respondida_em            timestamptz,
  respondida_por           uuid,
  canal_resposta           text check (canal_resposta in ('painel', 'whatsapp')),
  valida_ate               timestamptz,
  pedido_id                uuid references public.pedidos (id) on delete set null,
  criado_em                timestamptz not null default now()
);

create index if not exists cotacoes_frete_vendedor_loja_idx
  on public.cotacoes_frete_vendedor (loja_id, status, criado_em desc);
create index if not exists cotacoes_frete_vendedor_comprador_idx
  on public.cotacoes_frete_vendedor (comprador_id, loja_id, cep_destino, itens_chave);

alter table public.cotacoes_frete_vendedor enable row level security;

-- Leitura: o comprador vê as dele; o dono da loja vê as da loja. Escrita só
-- pelas RPCs security definer abaixo e pela service role (tick de avisos).
drop policy if exists cotacoes_frete_vendedor_comprador on public.cotacoes_frete_vendedor;
create policy cotacoes_frete_vendedor_comprador on public.cotacoes_frete_vendedor
  for select using (comprador_id = auth.uid());

drop policy if exists cotacoes_frete_vendedor_loja on public.cotacoes_frete_vendedor;
create policy cotacoes_frete_vendedor_loja on public.cotacoes_frete_vendedor
  for select using (exists (
    select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()));

drop policy if exists cotacoes_frete_vendedor_admin on public.cotacoes_frete_vendedor;
create policy cotacoes_frete_vendedor_admin on public.cotacoes_frete_vendedor
  for select using (public.is_admin());

alter table public.linha_itens
  add column if not exists cotacao_vendedor_id uuid
  references public.cotacoes_frete_vendedor (id) on delete set null;

-- ---------------------------------------------------------------- funções puras
-- Chave dos itens: só produto e quantidade, em ordem de produto. A mesma
-- chave identifica a cotação no pedido, no checkout e na substituição.
create or replace function public.cotacao_itens_chave(p_itens jsonb)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select md5(coalesce(string_agg(pid || ':' || qtd, '|' order by pid), ''))
  from (
    select e->>'produto_id' as pid, sum((e->>'quantidade')::int) as qtd
    from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) e
    group by e->>'produto_id'
  ) t;
$$;

-- Status que a tela mostra: prazo e validade valem na leitura, não dependem
-- do tick de avisos ter rodado (design D2).
create or replace function public.cotacao_status_efetivo(
  p_status text, p_responder_ate timestamptz, p_valida_ate timestamptz)
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select case
    when p_status = 'aguardando' and p_responder_ate < now() then 'expirada'
    when p_status = 'respondida' and p_valida_ate < now() then 'vencida'
    else p_status
  end;
$$;

-- Observação sem contato: telefone (9+ dígitos, com ou sem separador; CEP de
-- 8 dígitos passa), e-mail, chave Pix aleatória e link. Espelho em
-- src/lib/cotacao-frete/observacao.ts, que só serve para a mensagem da tela.
create or replace function public.cotacao_observacao_tem_contato(p_texto text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(p_texto, '') ~ '(\d[\s().-]?){9,}'
      or coalesce(p_texto, '') ~* '[^\s@]+@[^\s@]+\.[^\s@]+'
      or coalesce(p_texto, '') ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
      or coalesce(p_texto, '') ~* '(https?://|www\.|\.(com|br|net|org)(/|\s|$))';
$$;

-- ---------------------------------------------------------------- pedido de cotação
create or replace function public.solicitar_cotacao_frete(
  p_itens jsonb,
  p_cep text,
  p_observacao text default null,
  p_itens_carrinho jsonb default null,
  p_produto_id uuid default null,
  p_bairro text default null,
  p_cidade text default null,
  p_uf text default null,
  p_telefone text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_cep text := regexp_replace(coalesce(p_cep, ''), '\D', '', 'g');
  v_loja uuid;
  v_n int;
  v_n_ok int;
  v_origem text;
  v_chave text;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Faça login para pedir a cotação.';
  end if;
  if length(v_cep) <> 8 then
    raise exception 'CEP inválido.';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Informe o produto e a quantidade.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_itens) e
             where coalesce((e->>'quantidade')::int, 0) < 1) then
    raise exception 'Quantidade inválida.';
  end if;
  if length(coalesce(p_observacao, '')) > 500 then
    raise exception 'A observação passa de 500 caracteres.';
  end if;
  if public.cotacao_observacao_tem_contato(p_observacao) then
    raise exception 'A observação não pode ter telefone, e-mail, Pix ou link. Depois da compra você fala com o vendedor pelo chat.';
  end if;

  select count(*) into v_n
  from public.cotacoes_frete_vendedor
  where comprador_id = v_user and criado_em > now() - interval '1 hour';
  if v_n >= 10 then
    raise exception 'Muitos pedidos de cotação em pouco tempo. Tente de novo em uma hora.';
  end if;

  -- Todos os itens: mesma loja ativa com a flag, aprovados e com frete a combinar.
  select count(distinct e->>'produto_id'),
         count(distinct p.id) filter (where p.frete_a_combinar and p.status_produto = 'Aprovado'
                                        and l.situacao = 'Ativa' and l.entrega_a_combinar),
         min(p.loja_id::text)::uuid
    into v_n, v_n_ok, v_loja
  from jsonb_array_elements(p_itens) e
  left join public.produtos p on p.id = (e->>'produto_id')::uuid
  left join public.lojas l on l.id = p.loja_id;
  if v_n_ok <> v_n or (select count(distinct p.loja_id) from jsonb_array_elements(p_itens) e
                       join public.produtos p on p.id = (e->>'produto_id')::uuid) <> 1 then
    raise exception 'Este produto não aceita frete a combinar.';
  end if;
  if exists (select 1 from public.lojas where id = v_loja and owner_id = v_user) then
    raise exception 'Você não pode pedir cotação de um produto da sua loja.';
  end if;

  -- Região: se o produto declarou faixas de CEP, o destino precisa estar numa
  -- delas. Sem faixa declarada, a regra da UF de origem é conferida na action
  -- (precisa do ViaCEP). ponytail: RPC chamada direto pula a regra da UF; o
  -- pior caso é um pedido de cotação que o seller recusa.
  if exists (
    select 1 from jsonb_array_elements(p_itens) e
    where exists (select 1 from public.produto_faixas_cep pf where pf.produto_id = (e->>'produto_id')::uuid)
      and not exists (
        select 1 from public.produto_faixas_cep pf
        join public.faixas_cep f on f.id = pf.faixa_cep_id
        where pf.produto_id = (e->>'produto_id')::uuid
          and v_cep::int between f.cep_inicial and f.cep_final)
  ) then
    raise exception 'Não entregamos na sua região.';
  end if;

  select coalesce(
           case
             when length(regexp_replace(coalesce(p.cep_produto, ''), '\D', '', 'g')) = 8
               then regexp_replace(p.cep_produto, '\D', '', 'g')
             when length(regexp_replace(coalesce(p.cep_produto, ''), '\D', '', 'g')) = 7
               then '0' || regexp_replace(p.cep_produto, '\D', '', 'g')
           end,
           nullif(lpad(regexp_replace(coalesce(l.cep, ''), '\D', '', 'g'), 8, '0'), '00000000'))
    into v_origem
  from public.produtos p join public.lojas l on l.id = p.loja_id
  where p.id = ((p_itens->0)->>'produto_id')::uuid;

  v_chave := public.cotacao_itens_chave(p_itens);

  update public.cotacoes_frete_vendedor
     set status = 'substituida'
   where comprador_id = v_user and loja_id = v_loja and cep_destino = v_cep
     and itens_chave = v_chave and status in ('aguardando', 'respondida');

  insert into public.cotacoes_frete_vendedor (
    loja_id, comprador_id, produto_id, cep_destino, bairro_destino, cidade_destino, uf_destino,
    cep_origem, itens, itens_chave, itens_carrinho, observacao, telefone_comprador, responder_ate)
  values (
    v_loja, v_user, p_produto_id, v_cep, nullif(trim(p_bairro), ''), nullif(trim(p_cidade), ''),
    nullif(upper(trim(p_uf)), ''), v_origem,
    (select jsonb_agg(jsonb_build_object('produto_id', e->>'produto_id', 'quantidade', (e->>'quantidade')::int)
                      order by e->>'produto_id')
       from jsonb_array_elements(p_itens) e),
    v_chave,
    case when p_itens_carrinho is null or jsonb_array_length(p_itens_carrinho) = 0 then null
         else (select jsonb_agg(jsonb_build_object('produto_id', e->>'produto_id', 'quantidade', (e->>'quantidade')::int)
                                order by e->>'produto_id')
                 from jsonb_array_elements(p_itens_carrinho) e) end,
    nullif(trim(p_observacao), ''),
    nullif(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), ''),
    now() + interval '24 hours')
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------- resposta do seller
create or replace function public.responder_cotacao_frete(
  p_id uuid,
  p_recusar boolean,
  p_valor numeric default null,
  p_prazo_min int default null,
  p_prazo_max int default null,
  p_valor_carrinho numeric default null,
  p_confirmado boolean default false)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cot public.cotacoes_frete_vendedor;
  v_valor_produtos numeric;
begin
  select * into v_cot from public.cotacoes_frete_vendedor where id = p_id for update;
  if not found or not exists (
    select 1 from public.lojas where id = v_cot.loja_id and owner_id = auth.uid()) then
    raise exception 'Cotação não encontrada.';
  end if;
  if public.cotacao_status_efetivo(v_cot.status, v_cot.responder_ate, v_cot.valida_ate) <> 'aguardando' then
    raise exception 'Esta cotação expirou ou já foi respondida.';
  end if;

  if coalesce(p_recusar, false) then
    update public.cotacoes_frete_vendedor
       set status = 'recusada', respondida_em = now(), respondida_por = auth.uid(),
           canal_resposta = 'painel'
     where id = p_id;
    return;
  end if;

  if p_valor is null or p_valor < 0 then
    raise exception 'Informe o valor do frete (R$ 0,00 para frete grátis).';
  end if;
  if p_prazo_min is null or p_prazo_max is null or p_prazo_min < 1 or p_prazo_max > 60
     or p_prazo_min > p_prazo_max then
    raise exception 'Prazo inválido: informe de 1 a 60 dias úteis, mínimo até o máximo.';
  end if;
  if p_valor_carrinho is not null and (v_cot.itens_carrinho is null or p_valor_carrinho < 0) then
    raise exception 'Valor do carrinho inteiro indisponível para esta cotação.';
  end if;

  select sum(public.preco_faixa(p.id, (e->>'quantidade')::int, p.valor) * (e->>'quantidade')::int)
    into v_valor_produtos
  from jsonb_array_elements(v_cot.itens) e
  join public.produtos p on p.id = (e->>'produto_id')::uuid;
  if p_valor > coalesce(v_valor_produtos, 0) * 0.5 and not coalesce(p_confirmado, false) then
    raise exception 'CONFIRMAR_FRETE_ALTO';
  end if;

  update public.cotacoes_frete_vendedor
     set status = 'respondida',
         valor_centavos = round(p_valor * 100)::int,
         valor_carrinho_centavos = case when p_valor_carrinho is null then null
                                        else round(p_valor_carrinho * 100)::int end,
         prazo_min = p_prazo_min, prazo_max = p_prazo_max,
         respondida_em = now(), respondida_por = auth.uid(), canal_resposta = 'painel',
         valida_ate = now() + interval '48 hours'
   where id = p_id;
end;
$$;

create or replace function public.cancelar_cotacao_frete(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.cotacoes_frete_vendedor
     set status = 'cancelada'
   where id = p_id and comprador_id = auth.uid() and status in ('aguardando', 'respondida');
  if not found then
    raise exception 'Cotação não encontrada.';
  end if;
end;
$$;

-- ---------------------------------------------------------------- consulta do checkout
-- A cotação mais recente do comprador para esta loja, CEP e itens, com o
-- status efetivo. Uma cotação "usada" por pedido cancelado volta a valer.
create or replace function public.cotacao_frete_para_checkout(
  p_loja_id uuid, p_cep text, p_itens jsonb, p_itens_carrinho jsonb default null)
returns table (
  id uuid, status text, valor_centavos int, valor_carrinho_centavos int,
  prazo_min smallint, prazo_max smallint, valida_ate timestamptz, responder_ate timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.id,
         case when c.status = 'usada' and p.status_pedido = 'Cancelado'
                then public.cotacao_status_efetivo('respondida', c.responder_ate, c.valida_ate)
              else public.cotacao_status_efetivo(c.status, c.responder_ate, c.valida_ate) end,
         c.valor_centavos,
         case when c.itens_carrinho is not null
               and public.cotacao_itens_chave(c.itens_carrinho) = public.cotacao_itens_chave(p_itens_carrinho)
              then c.valor_carrinho_centavos end,
         c.prazo_min, c.prazo_max, c.valida_ate, c.responder_ate
  from public.cotacoes_frete_vendedor c
  left join public.pedidos p on p.id = c.pedido_id
  where c.comprador_id = auth.uid()
    and c.loja_id = p_loja_id
    and c.cep_destino = regexp_replace(coalesce(p_cep, ''), '\D', '', 'g')
    and c.itens_chave = public.cotacao_itens_chave(p_itens)
    and c.status not in ('substituida', 'cancelada')
  order by c.criado_em desc
  limit 1;
$$;

-- ---------------------------------------------------------------- dados públicos da PDP
-- `lojas` não tem leitura pública (0012); a página do produto só precisa
-- saber se a opção vale, a cidade/UF da loja e se o CEP está na faixa do
-- produto. Nada de CEP, endereço ou contato da loja sai daqui.
create or replace function public.entrega_a_combinar_info(p_produto_id uuid, p_cep text default null)
returns table (ativo boolean, loja_cidade text, loja_uf text, tem_faixas boolean, cep_na_faixa boolean)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.frete_a_combinar and l.entrega_a_combinar and l.situacao = 'Ativa' and p.status_produto = 'Aprovado',
         l.cidade, l.estado,
         exists (select 1 from public.produto_faixas_cep pf where pf.produto_id = p.id),
         exists (select 1 from public.produto_faixas_cep pf
                 join public.faixas_cep f on f.id = pf.faixa_cep_id
                 where pf.produto_id = p.id
                   and length(regexp_replace(coalesce(p_cep, ''), '\D', '', 'g')) = 8
                   and regexp_replace(p_cep, '\D', '', 'g')::int between f.cep_inicial and f.cep_final)
  from public.produtos p join public.lojas l on l.id = p.loja_id
  where p.id = p_produto_id;
$$;

grant execute on function public.entrega_a_combinar_info(uuid, text) to anon, authenticated;

revoke all on function public.solicitar_cotacao_frete(jsonb, text, text, jsonb, uuid, text, text, text, text) from public, anon;
grant execute on function public.solicitar_cotacao_frete(jsonb, text, text, jsonb, uuid, text, text, text, text) to authenticated;
revoke all on function public.responder_cotacao_frete(uuid, boolean, numeric, int, int, numeric, boolean) from public, anon;
grant execute on function public.responder_cotacao_frete(uuid, boolean, numeric, int, int, numeric, boolean) to authenticated;
revoke all on function public.cancelar_cotacao_frete(uuid) from public, anon;
grant execute on function public.cancelar_cotacao_frete(uuid) to authenticated;
revoke all on function public.cotacao_frete_para_checkout(uuid, text, jsonb, jsonb) from public, anon;
grant execute on function public.cotacao_frete_para_checkout(uuid, text, jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------- checkout
-- Nova versão a partir da definição vigente em produção (28/09/2026).
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

  if not v_retirada and coalesce(v_transp_fonte, '') not in ('uber_direct', 'tabela_importada', 'cotacao_vendedor') then
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

  if not v_retirada and coalesce(v_transp_fonte, '') not in ('uber_direct', 'tabela_importada', 'cotacao_vendedor') then
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
    elsif v_transp_fonte in ('uber_direct', 'tabela_importada', 'cotacao_vendedor') then
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
      retirar_na_loja, valor_frete, transportadora_id, cotacao_vendedor_id,
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
  set valor_frete = round(valor_frete * 0.70, 2)
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

-- ---------------------------------------------------------------- guarda da flag da loja
CREATE OR REPLACE FUNCTION public.guard_campos_restritos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or public.is_admin() then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if coalesce(current_setting('app.checkout_rpc', true), '') = 'on' then
    if tg_op = 'DELETE' then return old; end if;
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
    -- 0203: entrega a combinar só o admin liga (o frete ainda não entra no repasse).
    if tg_op = 'UPDATE' and new.entrega_a_combinar is distinct from old.entrega_a_combinar then
      raise exception 'Apenas admin liga ou desliga a entrega a combinar da loja.';
    end if;
    if tg_op = 'INSERT' and new.entrega_a_combinar then
      raise exception 'Apenas admin liga a entrega a combinar da loja.';
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
      or new.desconto_cupom is distinct from old.desconto_cupom
      or new.cupom_id is distinct from old.cupom_id
      or new.dt_pagamento_cliente is distinct from old.dt_pagamento_cliente
    ) then
      raise exception 'Apenas admin altera campos financeiros do item.';
    elsif tg_op = 'DELETE' and (old.pago is true or old.transferido is true) then
      raise exception 'Apenas admin apaga item já pago/transferido.';
    end if;

  elsif tg_table_name = 'disputas' then
    if tg_op = 'UPDATE' and (
         new.status = 'resolvida'
      or new.decisao is distinct from old.decisao
      or new.decisao_valor is distinct from old.decisao_valor
      or new.decisao_justificativa is distinct from old.decisao_justificativa
      or new.decidida_em is distinct from old.decidida_em
      or new.decidida_por is distinct from old.decidida_por
    ) then
      raise exception 'Apenas admin decide o desfecho final da disputa.';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;
