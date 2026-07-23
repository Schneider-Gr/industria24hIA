-- Chat direto comprador↔vendedor (MPDD-15).
-- Conversa = comprador × loja × produto (produto opcional, para dúvida geral
-- na página da loja). Mensagens em realtime via publication supabase_realtime.

create table if not exists public.conversas (
  id           uuid primary key default gen_random_uuid(),
  comprador_id uuid not null references auth.users (id) on delete cascade,
  loja_id      uuid not null references public.lojas (id) on delete cascade,
  produto_id   uuid references public.produtos (id) on delete set null,
  -- Snapshot para o seller identificar quem pergunta (auth.users não é legível).
  comprador_nome text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Uma conversa por comprador+loja+produto (produto null conta como valor).
create unique index if not exists conversas_unicidade
  on public.conversas (comprador_id, loja_id, produto_id) nulls not distinct;

create table if not exists public.mensagens (
  id          uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas (id) on delete cascade,
  autor_id    uuid not null references auth.users (id) on delete cascade,
  corpo       text not null check (length(btrim(corpo)) between 1 and 4000),
  lida_em     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists mensagens_conversa_idx
  on public.mensagens (conversa_id, created_at);

alter table public.conversas enable row level security;
alter table public.mensagens enable row level security;

-- Participante = comprador da conversa OU dono da loja da conversa.
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
      and (c.comprador_id = auth.uid() or l.owner_id = auth.uid())
  );
$$;

-- Conversas: comprador vê e cria as suas; seller vê as da loja dele.
create policy conversas_comprador_read on public.conversas for select
  using (comprador_id = auth.uid());
create policy conversas_comprador_insert on public.conversas for insert
  with check (comprador_id = auth.uid());
create policy conversas_seller_read on public.conversas for select
  using (exists (
    select 1 from public.lojas l
    where l.id = loja_id and l.owner_id = auth.uid()
  ));
create policy conversas_admin_all on public.conversas for all
  using (public.is_admin()) with check (public.is_admin());

-- Mensagens: só participantes leem/escrevem; autor sempre é quem envia.
create policy mensagens_participante_read on public.mensagens for select
  using (public.eh_participante_conversa(conversa_id));
create policy mensagens_participante_insert on public.mensagens for insert
  with check (autor_id = auth.uid() and public.eh_participante_conversa(conversa_id));
-- Update só para marcar como lida. A policy dá a linha; o privilégio por
-- coluna impede editar corpo/autor da mensagem do outro participante.
create policy mensagens_participante_update on public.mensagens for update
  using (public.eh_participante_conversa(conversa_id))
  with check (public.eh_participante_conversa(conversa_id));
revoke update on public.mensagens from authenticated;
grant update (lida_em) on public.mensagens to authenticated;
create policy mensagens_admin_all on public.mensagens for all
  using (public.is_admin()) with check (public.is_admin());

-- Mensagem nova reordena a caixa de entrada.
create or replace function public.tocar_conversa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversas set updated_at = now() where id = new.conversa_id;
  return new;
end;
$$;

drop trigger if exists mensagens_tocar_conversa on public.mensagens;
create trigger mensagens_tocar_conversa
  after insert on public.mensagens
  for each row execute function public.tocar_conversa();

-- Realtime nas mensagens (RLS vale para o stream).
do $$
begin
  alter publication supabase_realtime add table public.mensagens;
exception when duplicate_object then null;
end;
$$;
