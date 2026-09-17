-- 0176: Endereço de armazenagem dentro do centro — Milestone 2 do PRD 039
-- (US02), e o CEP estruturado do centro que o PRD 036 pediu na US03.
--
-- Estado que esta migration encontra (verificado em prod em 16/09/2026):
-- 21 centros de distribuição, TODOS com tipo = 'seller', nenhum do marketplace,
-- 5 com localizacao preenchida (JSON com address/lat/lng) e 1 com endereço em
-- Manaus, que é de seller. O centro é uma caixa preta: guarda saldo
-- (estoque_saldos, 0175) mas não tem nada dentro, então ninguém acha a
-- mercadoria no galpão sem perguntar a quem guardou.
--
-- Desenho: estoque_saldos continua sendo o saldo por CENTRO e continua sendo a
-- fonte da paridade com produtos.estoque_atual que a 0175 garante. O endereço
-- entra como detalhamento, num livro auxiliar alimentado pelo mesmo lançamento.
-- Não mexer na granularidade de estoque_saldos é deliberado: mudar a chave
-- primária dela mexeria no invariante de paridade que acabou de entrar em
-- produção, e o endereço não precisa disso para existir.
--
-- Em centro tipo 'industria' o endereço é obrigatório, porque é mercadoria de
-- terceiro num galpão operado pelo marketplace. Em centro 'seller' é opcional:
-- quem guarda no próprio depósito não precisa inventar rua e prédio.

-- ============================================================
-- 1. CEP estruturado no centro (US03 do PRD 036)
-- ============================================================

-- integer, como faixas_cep.cep_inicial (0014:19) e o v_cep das RPCs de
-- checkout. Texto criaria uma segunda representação de CEP no schema.
alter table public.centros_distribuicao
  add column if not exists cep integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'centros_distribuicao_cep_valido'
  ) then
    alter table public.centros_distribuicao
      add constraint centros_distribuicao_cep_valido
      check (cep is null or (cep between 1000000 and 99999999));
  end if;
end $$;

comment on column public.centros_distribuicao.cep is
  'CEP do centro, sem máscara (integer, como faixas_cep). Nulo é permitido para não invalidar os 21 centros que já existem; obrigatório para centro tipo industria a partir de 0176.';

-- Centro do marketplace sem CEP não tem como ser origem de prazo nem de
-- coleta, então aqui o CEP é requisito, não recomendação. A guarda é por
-- trigger e não por CHECK porque CHECK valeria também para as linhas
-- existentes, e os 21 centros de seller de hoje não têm CEP.
create or replace function public.centro_industria_exige_cep()
returns trigger
language plpgsql
as $$
begin
  if new.tipo = 'industria' and new.cep is null then
    raise exception 'Centro operado pelo Indústria precisa de CEP para ser origem de entrega.';
  end if;
  return new;
end;
$$;

drop trigger if exists centros_distribuicao_industria_exige_cep on public.centros_distribuicao;
create trigger centros_distribuicao_industria_exige_cep
  before insert or update on public.centros_distribuicao
  for each row execute function public.centro_industria_exige_cep();

-- ============================================================
-- 2. Endereços de armazenagem
-- ============================================================

create table if not exists public.estoque_enderecos (
  id          uuid primary key default gen_random_uuid(),
  centro_id   uuid not null references public.centros_distribuicao (id) on delete cascade,
  rua         text not null,
  predio      text not null,
  nivel       text not null,
  apartamento text not null,
  -- Código legível é derivado, não digitado: dois nomes para a mesma posição é
  -- como a mercadoria se perde. Coluna gerada, portanto sem chance de divergir.
  codigo      text generated always as (
                upper(btrim(rua)) || '-' || upper(btrim(predio)) || '-' ||
                upper(btrim(nivel)) || '-' || upper(btrim(apartamento))
              ) stored,
  bloqueado   boolean not null default false,
  motivo_bloqueio text,
  created_at  timestamptz not null default now(),

  constraint estoque_enderecos_partes_preenchidas
    check (btrim(rua) <> '' and btrim(predio) <> ''
       and btrim(nivel) <> '' and btrim(apartamento) <> ''),
  -- Bloquear sem dizer por quê deixa a posição parada e ninguém sabe se pode
  -- liberar. Mesma regra do motivo obrigatório do ledger (0175).
  constraint estoque_enderecos_bloqueio_com_motivo
    check (not bloqueado or btrim(coalesce(motivo_bloqueio, '')) <> '')
);

create unique index if not exists estoque_enderecos_codigo_unico
  on public.estoque_enderecos (centro_id, codigo);

create index if not exists estoque_enderecos_centro_idx
  on public.estoque_enderecos (centro_id);

-- ============================================================
-- 3. Saldo por endereço (livro auxiliar do saldo por centro)
-- ============================================================

create table if not exists public.estoque_saldos_endereco (
  produto_id    uuid not null references public.produtos (id) on delete cascade,
  endereco_id   uuid not null references public.estoque_enderecos (id),
  quantidade    int  not null default 0,
  atualizado_em timestamptz not null default now(),

  primary key (produto_id, endereco_id),
  constraint estoque_saldos_endereco_nao_negativo check (quantidade >= 0)
);

create index if not exists estoque_saldos_endereco_endereco_idx
  on public.estoque_saldos_endereco (endereco_id);

-- ============================================================
-- 4. Lançamento passa a poder carregar endereço
-- ============================================================

alter table public.estoque_movimentos
  add column if not exists endereco_id uuid references public.estoque_enderecos (id);

create index if not exists estoque_movimentos_endereco_idx
  on public.estoque_movimentos (endereco_id)
  where endereco_id is not null;

-- Validação antes de gravar: endereço tem que ser do mesmo centro do
-- lançamento, endereço bloqueado não recebe mercadoria, e centro do Indústria
-- não aceita lançamento sem endereço. As três no BEFORE, para que o lançamento
-- inválido nunca exista — lançamento é imutável (0175) e não dá para consertar
-- depois.
create or replace function public.estoque_movimento_valida_endereco()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo_centro   text;
  v_centro_do_end uuid;
  v_bloqueado     boolean;
begin
  select tipo into v_tipo_centro
    from public.centros_distribuicao where id = new.centro_id;

  if new.endereco_id is null then
    if v_tipo_centro = 'industria' then
      raise exception 'Mercadoria no CD do Indústria precisa de endereço de armazenagem. Informe a posição antes de lançar.';
    end if;
    return new;
  end if;

  select centro_id, bloqueado into v_centro_do_end, v_bloqueado
    from public.estoque_enderecos where id = new.endereco_id;

  if v_centro_do_end is null then
    raise exception 'Endereço de armazenagem não encontrado.';
  end if;

  if v_centro_do_end <> new.centro_id then
    raise exception 'O endereço informado pertence a outro centro de distribuição.';
  end if;

  -- Saída de endereço bloqueado é permitida de propósito: é assim que se
  -- esvazia uma posição avariada. O que não se faz é guardar mais lá.
  if v_bloqueado and new.quantidade > 0 then
    raise exception 'Este endereço está bloqueado e não pode receber mercadoria.';
  end if;

  return new;
end;
$$;

drop trigger if exists estoque_movimentos_valida_endereco on public.estoque_movimentos;
create trigger estoque_movimentos_valida_endereco
  before insert on public.estoque_movimentos
  for each row execute function public.estoque_movimento_valida_endereco();

-- Mesmo cuidado da 0175 (estoque_aplicar_no_saldo): garantir a linha com zero e
-- só então somar no UPDATE. `on conflict do update set quantidade = quantidade +
-- excluded.quantidade` avalia o CHECK na tupla proposta antes de detectar o
-- conflito, então um lançamento de saída estouraria
-- estoque_saldos_endereco_nao_negativo sem chegar ao DO UPDATE. O UPDATE também
-- trava a linha, serializando lançamentos concorrentes na mesma posição.
create or replace function public.estoque_aplicar_no_saldo_endereco()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.endereco_id is null then
    return new;
  end if;

  insert into public.estoque_saldos_endereco (produto_id, endereco_id, quantidade)
  values (new.produto_id, new.endereco_id, 0)
  on conflict (produto_id, endereco_id) do nothing;

  update public.estoque_saldos_endereco
     set quantidade = quantidade + new.quantidade,
         atualizado_em = now()
   where produto_id  = new.produto_id
     and endereco_id = new.endereco_id;

  return new;
end;
$$;

drop trigger if exists estoque_movimentos_aplica_saldo_endereco on public.estoque_movimentos;
create trigger estoque_movimentos_aplica_saldo_endereco
  after insert on public.estoque_movimentos
  for each row execute function public.estoque_aplicar_no_saldo_endereco();

-- ============================================================
-- 5. Guardas de exclusão
-- ============================================================

-- Mesma regra que a 0175 aplica ao centro: não se apaga o lugar onde ainda tem
-- mercadoria, porque o saldo iria embora junto.
create or replace function public.estoque_endereco_guarda_exclusao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saldo int;
begin
  select coalesce(sum(quantidade), 0) into v_saldo
    from public.estoque_saldos_endereco where endereco_id = old.id;

  if v_saldo > 0 then
    raise exception 'Este endereço ainda tem % unidade(s). Transfira o saldo antes de excluí-lo.', v_saldo;
  end if;

  return old;
end;
$$;

drop trigger if exists estoque_enderecos_guarda_exclusao on public.estoque_enderecos;
create trigger estoque_enderecos_guarda_exclusao
  before delete on public.estoque_enderecos
  for each row execute function public.estoque_endereco_guarda_exclusao();

-- ============================================================
-- 6. Cadastro de endereço pelo dono do centro
-- ============================================================

create or replace function public.estoque_endereco_criar(
  p_centro_id   uuid,
  p_rua         text,
  p_predio      text,
  p_nivel       text,
  p_apartamento text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
begin
  if v_user is null then
    raise exception 'Faça login para cadastrar endereços de armazenagem.';
  end if;

  -- Loja resolvida por dono, não por RLS: lojas_public_read combina via OR com
  -- a policy do dono, e sem este filtro daria para endereçar o centro de outro
  -- seller. É o mesmo bug real que centros/actions.ts documenta.
  if not exists (
    select 1 from public.centros_distribuicao c
      join public.lojas l on l.id = c.loja_id
     where c.id = p_centro_id and l.owner_id = v_user
  ) then
    raise exception 'Centro de distribuição não encontrado nesta loja.';
  end if;

  insert into public.estoque_enderecos (centro_id, rua, predio, nivel, apartamento)
  values (p_centro_id, btrim(p_rua), btrim(p_predio), btrim(p_nivel), btrim(p_apartamento))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.estoque_endereco_criar(uuid, text, text, text, text) from public;
grant execute on function public.estoque_endereco_criar(uuid, text, text, text, text) to authenticated;

create or replace function public.estoque_endereco_bloquear(
  p_endereco_id uuid,
  p_bloquear    boolean,
  p_motivo      text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Faça login para alterar endereços de armazenagem.';
  end if;

  if p_bloquear and btrim(coalesce(p_motivo, '')) = '' then
    raise exception 'Informe o motivo do bloqueio do endereço.';
  end if;

  if not exists (
    select 1 from public.estoque_enderecos e
      join public.centros_distribuicao c on c.id = e.centro_id
      join public.lojas l on l.id = c.loja_id
     where e.id = p_endereco_id and l.owner_id = v_user
  ) then
    raise exception 'Endereço de armazenagem não encontrado nesta loja.';
  end if;

  update public.estoque_enderecos
     set bloqueado = p_bloquear,
         motivo_bloqueio = case when p_bloquear then btrim(p_motivo) else null end
   where id = p_endereco_id;
end;
$$;

revoke all on function public.estoque_endereco_bloquear(uuid, boolean, text) from public;
grant execute on function public.estoque_endereco_bloquear(uuid, boolean, text) to authenticated;

-- Exclusão também por função, e não por policy de DELETE: sem policy de escrita
-- nesta tabela, um delete do cliente afetaria zero linhas em silêncio e o seller
-- veria o botão não fazer nada. É o mesmo bug que centros/actions.ts documenta
-- para o botão de excluir centro antes da 0175. A guarda de saldo continua no
-- trigger, que vale para qualquer caminho.
create or replace function public.estoque_endereco_excluir(p_endereco_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Faça login para excluir endereços de armazenagem.';
  end if;

  if not exists (
    select 1 from public.estoque_enderecos e
      join public.centros_distribuicao c on c.id = e.centro_id
      join public.lojas l on l.id = c.loja_id
     where e.id = p_endereco_id and l.owner_id = v_user
  ) then
    raise exception 'Endereço de armazenagem não encontrado nesta loja.';
  end if;

  delete from public.estoque_enderecos where id = p_endereco_id;
end;
$$;

revoke all on function public.estoque_endereco_excluir(uuid) from public;
grant execute on function public.estoque_endereco_excluir(uuid) to authenticated;

-- ============================================================
-- 7. RLS — negar por padrão, leitura para o dono
-- ============================================================

alter table public.estoque_enderecos        enable row level security;
alter table public.estoque_saldos_endereco  enable row level security;

drop policy if exists estoque_enderecos_leitura_dono on public.estoque_enderecos;
create policy estoque_enderecos_leitura_dono
  on public.estoque_enderecos for select
  to authenticated
  using (
    exists (
      select 1 from public.centros_distribuicao c
        join public.lojas l on l.id = c.loja_id
       where c.id = estoque_enderecos.centro_id
         and l.owner_id = auth.uid()
    )
  );

-- O saldo por endereço é do dono do PRODUTO, não do dono do centro: no CD do
-- Indústria a mercadoria é de terceiro, e o seller precisa ver onde está o que
-- é dele sem ver o que é dos outros.
drop policy if exists estoque_saldos_endereco_leitura_dono on public.estoque_saldos_endereco;
create policy estoque_saldos_endereco_leitura_dono
  on public.estoque_saldos_endereco for select
  to authenticated
  using (
    exists (
      select 1 from public.produtos p
        join public.lojas l on l.id = p.loja_id
       where p.id = estoque_saldos_endereco.produto_id
         and l.owner_id = auth.uid()
    )
  );

-- Sem policy de escrita: endereço e saldo só mudam pelas funções security
-- definer acima e pelos triggers do ledger.
