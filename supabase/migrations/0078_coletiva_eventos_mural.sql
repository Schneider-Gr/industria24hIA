-- 0078: etapas visíveis (eventos) e conversa entre os participantes (mural).
--
-- Os agentes (tools/coletiva-agents) e as RPCs escrevem em coletiva_eventos;
-- a página da coletiva, o painel do seller e o fanout de notificação leem daí.
-- O mural REUSA o chat da 0075 (conversas/mensagens, realtime e RLS já
-- prontos) em vez de uma tabela nova: conversa com coletiva_id preenchido é
-- um fio coletivo, onde todo participante lê e escreve.

-- ============ 1. Eventos ============
create table if not exists public.coletiva_eventos (
  id           uuid primary key default gen_random_uuid(),
  coletiva_id  uuid not null references public.compras_coletivas (id) on delete cascade,
  tipo         text not null check (tipo in (
                 'criada', 'participante_entrou', 'lote_desbloqueado',
                 'meta_atingida', 'prazo_proximo', 'fechada', 'expirada',
                 'cancelada', 'agente')),
  payload      jsonb not null default '{}'::jsonb,
  notificado_em timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists coletiva_eventos_coletiva_idx
  on public.coletiva_eventos (coletiva_id, created_at desc);
-- Um evento por tipo+marco: o registrador é idempotente por chave.
create unique index if not exists coletiva_eventos_marco_unico
  on public.coletiva_eventos (coletiva_id, tipo, (payload->>'marco'))
  where payload->>'marco' is not null;

alter table public.coletiva_eventos enable row level security;

-- Leem: participantes da coletiva, dono da loja e admin.
drop policy if exists coletiva_eventos_read on public.coletiva_eventos;
create policy coletiva_eventos_read on public.coletiva_eventos
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.coletiva_participacoes cp
      where cp.coletiva_id = coletiva_eventos.coletiva_id and cp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.compras_coletivas c
      join public.lojas l on l.id = c.loja_id
      where c.id = coletiva_eventos.coletiva_id and l.owner_id = auth.uid()
    )
  );
-- Escrita só por RPC security definer / service role.

-- ============ 2. Registrador de evento (idempotente por marco) ============
create or replace function public.coletiva_evento(
  p_coletiva_id uuid,
  p_tipo text,
  p_payload jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into coletiva_eventos (coletiva_id, tipo, payload)
  values (p_coletiva_id, p_tipo, coalesce(p_payload, '{}'::jsonb))
  on conflict do nothing;
end;
$$;

-- ============ 3. Mural: conversa da coletiva ============
alter table public.conversas
  add column if not exists coletiva_id uuid references public.compras_coletivas (id) on delete cascade;

-- O fio coletivo não pode competir com a unicidade da conversa privada
-- (comprador × loja × produto) — são coisas diferentes.
drop index if exists public.conversas_unicidade;
create unique index if not exists conversas_unicidade
  on public.conversas (comprador_id, loja_id, produto_id)
  nulls not distinct
  where coletiva_id is null;
create unique index if not exists conversas_coletiva_unica
  on public.conversas (coletiva_id)
  where coletiva_id is not null;

-- Participante da coletiva é participante do fio coletivo.
create or replace function public.eh_participante_conversa(p_conversa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversas c
    left join public.lojas l on l.id = c.loja_id
    where c.id = p_conversa_id
      and (
        c.comprador_id = auth.uid()
        or l.owner_id = auth.uid()
        or (c.coletiva_id is not null and exists (
              select 1 from public.coletiva_participacoes cp
              where cp.coletiva_id = c.coletiva_id and cp.user_id = auth.uid()))
      )
  );
$$;

-- Leitura da conversa em si (as mensagens já usam eh_participante_conversa).
drop policy if exists conversas_participante_coletiva_read on public.conversas;
create policy conversas_participante_coletiva_read on public.conversas
  for select using (
    coletiva_id is not null and exists (
      select 1 from public.coletiva_participacoes cp
      where cp.coletiva_id = conversas.coletiva_id and cp.user_id = auth.uid()
    )
  );

-- Abre (ou devolve) o mural da coletiva. Só participante abre.
create or replace function public.coletiva_mural(p_coletiva_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_col record;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Faça login para acessar o mural da coletiva.';
  end if;

  select c.*, l.owner_id into v_col
  from compras_coletivas c
  join lojas l on l.id = c.loja_id
  where c.id = p_coletiva_id;
  if not found then
    raise exception 'Compra coletiva não encontrada.';
  end if;

  if v_col.owner_id <> v_user and not exists (
    select 1 from coletiva_participacoes
    where coletiva_id = p_coletiva_id and user_id = v_user
  ) then
    raise exception 'Só participantes da coletiva acessam o mural.';
  end if;

  select id into v_id from conversas where coletiva_id = p_coletiva_id;
  if v_id is null then
    insert into conversas (comprador_id, loja_id, produto_id, coletiva_id, comprador_nome)
    values (v_col.criador_id, v_col.loja_id, v_col.produto_id, p_coletiva_id, 'Compra coletiva')
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.coletiva_evento(uuid, text, jsonb) from public;
revoke all on function public.coletiva_mural(uuid) from public;
grant execute on function public.coletiva_mural(uuid) to authenticated;
-- A varredura (/api/coletivas/tick) roda com service role.
grant execute on function public.coletiva_evento(uuid, text, jsonb) to service_role;
grant execute on function public.coletiva_fechar(uuid, boolean) to service_role;

-- ============ 4. Eventos emitidos pelas RPCs do ciclo de vida ============
-- Reescreve só os pontos de emissão; o resto da 0077 fica como está.
create or replace function public.coletiva_cancelar(p_coletiva_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_col record;
begin
  if v_user is null then
    raise exception 'Faça login.';
  end if;

  select c.*, l.owner_id into v_col
  from compras_coletivas c
  join lojas l on l.id = c.loja_id
  where c.id = p_coletiva_id
  for update of c;
  if not found then
    raise exception 'Compra coletiva não encontrada.';
  end if;
  if v_col.owner_id <> v_user then
    raise exception 'Apenas o dono da loja pode cancelar esta coletiva.';
  end if;
  if v_col.status not in ('Aberta', 'Viavel') then
    raise exception 'Só é possível cancelar uma coletiva em andamento (atual: %).', v_col.status;
  end if;

  update compras_coletivas set status = 'Cancelada' where id = p_coletiva_id;
  perform coletiva_evento(p_coletiva_id, 'cancelada', '{}'::jsonb);
end;
$$;

revoke all on function public.coletiva_cancelar(uuid) from public;
grant execute on function public.coletiva_cancelar(uuid) to authenticated;
