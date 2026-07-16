-- 0058: repasse PIX automático (Processo 2 de docs/e4-split-repasse-bpmn.md).
-- Decisões do dono confirmadas em 2026-07-16 (fecham D-E4.1/2/4 do doc):
--   D-E4.4: transferência em TEMPO REAL, disparada no webhook PAYMENT_RECEIVED/
--           CONFIRMED, por pedido (não em lote).
--   D-E4.2: o seller recebe itens − 5% plataforma − % afiliado + FRETE.
--   D-E4.1: o afiliado TAMBÉM recebe PIX direto da plataforma.
-- A chave PIX do afiliado é POR USUÁRIO (tabela nova afiliados_chave_pix), não
-- por afiliação: linha_itens.afiliado_id referencia o user, e um afiliado com
-- várias afiliações teria N chaves ambíguas se a coluna vivesse em afiliacoes.
-- Mesmo regime de segurança da chave da loja (0035): RPC dedicada, validação
-- de formato, carência de 24h, auditoria. Dinheiro só sai pelo app
-- (lib/asaas.ts createPixTransfer), nunca por esta migration.

-- ============ 1. Chave PIX do afiliado ============
create table if not exists public.afiliados_chave_pix (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  chave_pix               text not null,
  tipo_chave_pix          text not null check (tipo_chave_pix in ('CNPJ','CPF','EMAIL','PHONE')),
  chave_pix_confirmada_em timestamptz,
  atualizado_em           timestamptz not null default now()
);

alter table public.afiliados_chave_pix enable row level security;

create policy afiliados_chave_pix_own_read on public.afiliados_chave_pix
  for select using (user_id = auth.uid() or public.is_admin());
-- Escrita só pela RPC abaixo (security definer) — sem policy de insert/update.

create or replace function public.alterar_chave_pix_afiliado(
  p_chave_pix text,
  p_tipo_chave_pix text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antes record;
  v_digitos text;
begin
  if auth.uid() is null then
    raise exception 'Faça login para alterar a chave PIX.';
  end if;
  if p_tipo_chave_pix not in ('CNPJ', 'CPF', 'EMAIL', 'PHONE') then
    raise exception 'Tipo de chave PIX inválido.';
  end if;
  if p_chave_pix is null or length(trim(p_chave_pix)) = 0 then
    raise exception 'Chave PIX não pode ser vazia.';
  end if;

  -- Mesma validação de formato da 0035 (DICT de titularidade segue pendente).
  v_digitos := regexp_replace(p_chave_pix, '\D', '', 'g');
  if p_tipo_chave_pix = 'CPF' and length(v_digitos) <> 11 then
    raise exception 'CPF inválido: deve ter 11 dígitos.';
  elsif p_tipo_chave_pix = 'CNPJ' and length(v_digitos) <> 14 then
    raise exception 'CNPJ inválido: deve ter 14 dígitos.';
  elsif p_tipo_chave_pix = 'EMAIL' and p_chave_pix !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'E-mail inválido.';
  elsif p_tipo_chave_pix = 'PHONE' and length(v_digitos) not between 10 and 13 then
    raise exception 'Telefone inválido.';
  end if;

  select chave_pix, tipo_chave_pix into v_antes
  from afiliados_chave_pix where user_id = auth.uid();

  insert into afiliados_chave_pix (user_id, chave_pix, tipo_chave_pix, chave_pix_confirmada_em, atualizado_em)
  values (auth.uid(), p_chave_pix, p_tipo_chave_pix, null, now())
  on conflict (user_id) do update
    set chave_pix = excluded.chave_pix,
        tipo_chave_pix = excluded.tipo_chave_pix,
        chave_pix_confirmada_em = null,  -- reinicia carência a cada troca
        atualizado_em = now();

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_antes, dados_depois)
  values (auth.uid(), 'afiliado', 'chave_pix_afiliado.alterada', 'afiliados_chave_pix', auth.uid(),
          jsonb_build_object('chave_pix', v_antes.chave_pix, 'tipo_chave_pix', v_antes.tipo_chave_pix),
          jsonb_build_object('chave_pix', p_chave_pix, 'tipo_chave_pix', p_tipo_chave_pix));
end;
$$;

revoke all on function public.alterar_chave_pix_afiliado(text, text) from public;
grant execute on function public.alterar_chave_pix_afiliado(text, text) to authenticated;

create or replace function public.chave_pix_afiliado_elegivel(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select coalesce(
    (select chave_pix_confirmada_em is not null
        and chave_pix_confirmada_em <= now() - interval '24 hours'
     from afiliados_chave_pix where user_id = p_user_id),
    false);
$$;

create or replace function public.confirmar_chave_pix_afiliado(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (auth.uid() is null or public.is_admin()) then
    raise exception 'Apenas admin ou service_role confirmam chave PIX.';
  end if;
  update afiliados_chave_pix set chave_pix_confirmada_em = now() where user_id = p_user_id;
end;
$$;

revoke all on function public.confirmar_chave_pix_afiliado(uuid) from public;
grant execute on function public.confirmar_chave_pix_afiliado(uuid) to authenticated;

-- ============ 2. Tabela repasses (ledger de transferências) ============
create table if not exists public.repasses (
  id                uuid primary key default gen_random_uuid(),
  pedido_id         uuid not null references public.pedidos (id) on delete restrict,
  destino           text not null check (destino in ('seller','afiliado')),
  loja_id           uuid references public.lojas (id) on delete restrict,
  afiliado_id       uuid references auth.users (id) on delete restrict,
  chave_pix         text,          -- snapshot no momento do cálculo
  tipo_chave_pix    text,
  valor             numeric(12,2) not null check (valor > 0),
  status            text not null default 'pendente'
                    check (status in ('pendente','transferido','falhou','inelegivel')),
  asaas_transfer_id text,
  erro              text,
  criado_em         timestamptz not null default now(),
  transferido_em    timestamptz,
  constraint repasses_destino_coerente check (
    (destino = 'seller' and loja_id is not null and afiliado_id is null) or
    (destino = 'afiliado' and afiliado_id is not null)
  )
);

-- Idempotência: um repasse por (pedido, destino, afiliado). Webhook Asaas
-- re-entrega eventos; on conflict do nothing no cálculo depende deste índice.
create unique index if not exists repasses_unq
  on public.repasses (pedido_id, destino, coalesce(afiliado_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.repasses enable row level security;

create policy repasses_seller_read on public.repasses
  for select using (
    public.is_admin()
    or (afiliado_id = auth.uid())
    or exists (select 1 from lojas l where l.id = repasses.loja_id and l.owner_id = auth.uid())
  );
-- Escrita só via service_role/RPCs security definer (deny by default).

-- ============ 3. Cálculo dos repasses de um pedido pago ============
-- Chamada pelo webhook (service_role) após confirmar o pagamento. Insere as
-- linhas em `repasses` (idempotente) e devolve as do pedido. Chave inelegível
-- (ausente ou em carência 24h) vira status='inelegivel' — nada se perde, o
-- admin revalida depois via revalidar_repasse.
create or replace function public.calcular_repasses_pedido(p_pedido_id uuid)
returns setof public.repasses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loja uuid;
  v_valor_seller numeric(12,2);
begin
  if not (auth.uid() is null or public.is_admin()) then
    raise exception 'Apenas admin ou service_role calculam repasses.';
  end if;

  select loja_id into v_loja from pedidos
  where id = p_pedido_id and dt_pagamento is not null;
  if not found then
    raise exception 'Pedido inexistente ou ainda não pago.';
  end if;

  -- Seller: itens − 5% plataforma − comissão de afiliado + frete (D-E4.2).
  select round(sum(valor) - sum(repasse_ind) - sum(coalesce(repasse_afiliado, 0))
               + sum(coalesce(valor_frete, 0)), 2)
    into v_valor_seller
  from linha_itens where pedido_id = p_pedido_id;

  if coalesce(v_valor_seller, 0) > 0 then
    insert into repasses (pedido_id, destino, loja_id, chave_pix, tipo_chave_pix, valor, status)
    select p_pedido_id, 'seller', v_loja, l.chave_pix, l.tipo_chave_pix, v_valor_seller,
           case when public.chave_pix_elegivel_repasse(v_loja) then 'pendente' else 'inelegivel' end
    from lojas l where l.id = v_loja
    on conflict do nothing;
  end if;

  -- Afiliados: soma de repasse_afiliado por usuário afiliado (D-E4.1).
  insert into repasses (pedido_id, destino, loja_id, afiliado_id, chave_pix, tipo_chave_pix, valor, status)
  select p_pedido_id, 'afiliado', v_loja, li.afiliado_id, acp.chave_pix, acp.tipo_chave_pix,
         round(sum(li.repasse_afiliado), 2),
         case when public.chave_pix_afiliado_elegivel(li.afiliado_id) then 'pendente' else 'inelegivel' end
  from linha_itens li
  left join afiliados_chave_pix acp on acp.user_id = li.afiliado_id
  where li.pedido_id = p_pedido_id
    and li.afiliado_id is not null
    and coalesce(li.repasse_afiliado, 0) > 0
  group by li.afiliado_id, acp.chave_pix, acp.tipo_chave_pix
  on conflict do nothing;

  return query select * from repasses where pedido_id = p_pedido_id;
end;
$$;

revoke all on function public.calcular_repasses_pedido(uuid) from public;
grant execute on function public.calcular_repasses_pedido(uuid) to authenticated;

-- ============ 4. Revalidação (ação do admin p/ inelegivel/falhou) ============
-- Re-snapshota a chave e volta o repasse para 'pendente' se agora elegível;
-- a transferência em si é refeita pelo app (mesmo caminho do webhook).
create or replace function public.revalidar_repasse(p_repasse_id uuid)
returns public.repasses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rep repasses;
  v_elegivel boolean;
begin
  if not (auth.uid() is null or public.is_admin()) then
    raise exception 'Apenas admin ou service_role revalidam repasses.';
  end if;

  select * into v_rep from repasses where id = p_repasse_id;
  if not found then
    raise exception 'Repasse não encontrado.';
  end if;
  if v_rep.status = 'transferido' then
    raise exception 'Repasse já transferido.';
  end if;

  if v_rep.destino = 'seller' then
    v_elegivel := public.chave_pix_elegivel_repasse(v_rep.loja_id);
    update repasses r
      set status = case when v_elegivel then 'pendente' else 'inelegivel' end,
          erro = null,
          chave_pix = l.chave_pix,
          tipo_chave_pix = l.tipo_chave_pix
      from lojas l
      where r.id = p_repasse_id and l.id = r.loja_id
      returning r.* into v_rep;
  else
    v_elegivel := public.chave_pix_afiliado_elegivel(v_rep.afiliado_id);
    update repasses r
      set status = case when v_elegivel then 'pendente' else 'inelegivel' end,
          erro = null,
          chave_pix = acp.chave_pix,
          tipo_chave_pix = acp.tipo_chave_pix
      from afiliados_chave_pix acp
      where r.id = p_repasse_id and acp.user_id = r.afiliado_id
      returning r.* into v_rep;
  end if;

  return v_rep;
end;
$$;

revoke all on function public.revalidar_repasse(uuid) from public;
grant execute on function public.revalidar_repasse(uuid) to authenticated;

-- ============ 5. Espelho em linha_itens.transferido ============
-- Repasse do seller transferido marca os itens do pedido (a auditoria 0034
-- já loga a mudança de `transferido`). Security definer: o guard 0035 exige
-- admin/service p/ tocar em transferido, e este trigger só dispara a partir
-- de UPDATE em repasses, que só service/admin fazem.
create or replace function public.espelhar_repasse_transferido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.destino = 'seller' and new.status = 'transferido'
     and old.status is distinct from 'transferido' then
    update linha_itens set transferido = true where pedido_id = new.pedido_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_espelhar_repasse_transferido on public.repasses;
create trigger trg_espelhar_repasse_transferido
  after update on public.repasses
  for each row execute function public.espelhar_repasse_transferido();
