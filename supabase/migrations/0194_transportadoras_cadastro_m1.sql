-- 0194: cadastro de transportadoras, tabela por faixas e CEP do CD (PRD 049,
-- Milestone 1). Spec: openspec/changes/frete-tabela-transportadora-cadastro/.
--
-- Aditiva: não muda cotar_frete_tabela nem o checkout (M2). Em produção, em
-- 24/09/2026, transportadora_faixas_frete tinha 0 linhas, então remover o
-- override de faixa global por loja (D6) não apaga dado de ninguém.

-- ============================================================
-- 1. transportadoras: limites, cubagem, rastreio, moderação (D1, D2, D8)
-- ============================================================
alter table public.transportadoras
  add column if not exists codigo_referencia text,
  add column if not exists peso_min numeric check (peso_min is null or peso_min >= 0),
  add column if not exists peso_max numeric check (peso_max is null or peso_max > 0),
  add column if not exists valor_min numeric check (valor_min is null or valor_min >= 0),
  add column if not exists valor_max numeric check (valor_max is null or valor_max > 0),
  add column if not exists altura_max numeric check (altura_max is null or altura_max > 0),
  add column if not exists largura_max numeric check (largura_max is null or largura_max > 0),
  add column if not exists comprimento_max numeric check (comprimento_max is null or comprimento_max > 0),
  add column if not exists fator_cubagem numeric check (fator_cubagem is null or fator_cubagem > 0),
  add column if not exists url_rastreio text,
  add column if not exists desativada_por_admin boolean not null default false,
  add column if not exists motivo_desativacao text,
  add column if not exists encerra_em date,
  add column if not exists tabela_atualizada_em timestamptz,
  add column if not exists revisar_categorias boolean not null default false;

alter table public.transportadoras drop constraint if exists transportadoras_peso_faixa_check;
alter table public.transportadoras add constraint transportadoras_peso_faixa_check
  check (peso_min is null or peso_max is null or peso_min <= peso_max);
alter table public.transportadoras drop constraint if exists transportadoras_valor_faixa_check;
alter table public.transportadoras add constraint transportadoras_valor_faixa_check
  check (valor_min is null or valor_max is null or valor_min <= valor_max);

-- Encerramento por data vale só para global (própria o seller desativa).
alter table public.transportadoras drop constraint if exists transportadoras_encerra_so_global_check;
alter table public.transportadoras add constraint transportadoras_encerra_so_global_check
  check (encerra_em is null or loja_id is null);

-- Nome único por loja, sem diferenciar maiúsculas (D2).
create unique index if not exists transportadoras_loja_nome_uidx
  on public.transportadoras (loja_id, lower(nome)) where loja_id is not null;

-- Só o admin mexe na moderação, e a desativada pelo admin só o admin
-- reativa (D8). Policy não expressa "esta coluna só o admin muda".
create or replace function public.transportadora_guarda_moderacao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'INSERT' then
    new.desativada_por_admin := false;
    new.motivo_desativacao := null;
    new.encerra_em := null;
    return new;
  end if;
  if tg_op = 'DELETE' then
    -- Apagar e recriar com o mesmo nome furaria a moderação.
    if old.desativada_por_admin then
      raise exception 'Transportadora desativada pelo admin não pode ser apagada pelo seller.';
    end if;
    return old;
  end if;
  if new.desativada_por_admin is distinct from old.desativada_por_admin
     or new.motivo_desativacao is distinct from old.motivo_desativacao
     or new.encerra_em is distinct from old.encerra_em then
    raise exception 'Só o admin altera moderação ou encerramento da transportadora.';
  end if;
  if new.loja_id is distinct from old.loja_id then
    -- As faixas guardam o loja_id da transportadora (D6); trocar a loja as deixaria órfãs.
    raise exception 'A loja da transportadora não pode ser trocada.';
  end if;
  if old.desativada_por_admin and new.ativo and not old.ativo then
    raise exception 'Transportadora desativada pelo admin: só o admin reativa.';
  end if;
  return new;
end;
$$;

drop trigger if exists transportadoras_guarda_moderacao on public.transportadoras;
create trigger transportadoras_guarda_moderacao
  before insert or update or delete on public.transportadoras
  for each row execute function public.transportadora_guarda_moderacao();

-- ============================================================
-- 2. transportadora_faixas_frete: origem, prazos, taxas, grade (D1, D6)
-- ============================================================
alter table public.transportadora_faixas_frete
  add column if not exists cep_origem_inicial integer,
  add column if not exists cep_origem_final integer,
  add column if not exists prazo_min integer check (prazo_min is null or prazo_min >= 0),
  add column if not exists prazo_max integer check (prazo_max is null or prazo_max >= 0),
  add column if not exists ad_valorem numeric not null default 0 check (ad_valorem >= 0),
  add column if not exists kg_adicional numeric not null default 0 check (kg_adicional >= 0),
  add column if not exists icms numeric not null default 0 check (icms >= 0 and icms < 100),
  add column if not exists frete_minimo numeric not null default 0 check (frete_minimo >= 0),
  add column if not exists taxa_fixa numeric not null default 0 check (taxa_fixa >= 0),
  add column if not exists cd_id uuid references public.centros_distribuicao (id) on delete cascade,
  add column if not exists veiculo text check (veiculo is null or veiculo in ('moto', 'carro', 'utilitario'));

alter table public.transportadora_faixas_frete drop constraint if exists transportadora_faixas_origem_check;
alter table public.transportadora_faixas_frete add constraint transportadora_faixas_origem_check
  check (
    (cep_origem_inicial is null and cep_origem_final is null)
    or (cep_origem_inicial is not null and cep_origem_final is not null
        and cep_origem_inicial <= cep_origem_final)
  );
alter table public.transportadora_faixas_frete drop constraint if exists transportadora_faixas_prazo_check;
alter table public.transportadora_faixas_frete add constraint transportadora_faixas_prazo_check
  check (prazo_min is null or prazo_max is null or prazo_min <= prazo_max);

-- loja_id da faixa passa a ser sempre o da transportadora: faixa de global
-- não tem loja, faixa de própria é da loja dona. Acaba o override (D6).
create or replace function public.transportadora_faixa_loja_da_transportadora()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  select t.loja_id into new.loja_id
  from public.transportadoras t where t.id = new.transportadora_id;
  return new;
end;
$$;

drop trigger if exists transportadora_faixas_loja on public.transportadora_faixas_frete;
create trigger transportadora_faixas_loja
  before insert or update of transportadora_id, loja_id on public.transportadora_faixas_frete
  for each row execute function public.transportadora_faixa_loja_da_transportadora();

create index if not exists transportadora_faixas_frete_cd_idx
  on public.transportadora_faixas_frete (transportadora_id, cd_id);

-- ============================================================
-- 3. centros_distribuicao: endereço e retirada (D11)
-- ============================================================
-- CEP já existe (0176). Obrigatório só na aplicação: 21 centros de seller
-- não têm CEP e um CHECK ou trigger quebraria qualquer update neles.
alter table public.centros_distribuicao
  add column if not exists endereco text,
  add column if not exists aceita_retirada boolean not null default false,
  add column if not exists horario_retirada text;

-- ============================================================
-- 4. Ativação de global pela loja (D3)
-- ============================================================
create table if not exists public.loja_transportadoras (
  loja_id            uuid not null references public.lojas (id) on delete cascade,
  transportadora_id  uuid not null references public.transportadoras (id) on delete cascade,
  codigo_cliente     text not null check (length(trim(codigo_cliente)) > 0),
  contrato_aceito_em timestamptz not null,
  ativo              boolean not null default true,
  criado_em          timestamptz not null default now(),
  primary key (loja_id, transportadora_id)
);

create or replace function public.loja_transportadora_so_global()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.transportadoras t
    where t.id = new.transportadora_id and t.loja_id is null
  ) then
    raise exception 'Só transportadora global é ativada por loja.';
  end if;
  if new.ativo and not exists (
    select 1 from public.transportadoras t
    where t.id = new.transportadora_id and t.ativo
      and (t.encerra_em is null or t.encerra_em > current_date)
  ) then
    raise exception 'Transportadora global inativa ou encerrada.';
  end if;
  -- A data do aceite é a do servidor, não a que o cliente mandar.
  if not public.is_admin() and auth.uid() is not null
     and (tg_op = 'INSERT' or new.codigo_cliente is distinct from old.codigo_cliente
          or (new.ativo and not old.ativo)) then
    new.contrato_aceito_em := now();
  end if;
  return new;
end;
$$;

drop trigger if exists loja_transportadoras_so_global on public.loja_transportadoras;
create trigger loja_transportadoras_so_global
  before insert or update on public.loja_transportadoras
  for each row execute function public.loja_transportadora_so_global();

alter table public.loja_transportadoras enable row level security;

drop policy if exists loja_transportadoras_dono on public.loja_transportadoras;
create policy loja_transportadoras_dono on public.loja_transportadoras
  for all
  using (loja_id in (select id from public.lojas where owner_id = auth.uid()))
  with check (loja_id in (select id from public.lojas where owner_id = auth.uid()));

drop policy if exists loja_transportadoras_admin on public.loja_transportadoras;
create policy loja_transportadoras_admin on public.loja_transportadoras
  for all using (public.is_admin()) with check (public.is_admin());

create index if not exists loja_transportadoras_transportadora_idx
  on public.loja_transportadoras (transportadora_id);

-- ============================================================
-- 5. Categorias atendidas (D9)
-- ============================================================
create table if not exists public.transportadora_nos (
  transportadora_id uuid not null references public.transportadoras (id) on delete cascade,
  taxonomia_no_id   uuid not null references public.taxonomia_nos (id) on delete cascade,
  primary key (transportadora_id, taxonomia_no_id)
);

alter table public.transportadora_nos enable row level security;

-- Leitura segue a da transportadora: global ativa é visível, própria só ao dono.
drop policy if exists transportadora_nos_read on public.transportadora_nos;
create policy transportadora_nos_read on public.transportadora_nos
  for select using (
    public.is_admin()
    or transportadora_id in (
      select t.id from public.transportadoras t
      where (t.loja_id is null and t.ativo)
         or t.loja_id in (select id from public.lojas where owner_id = auth.uid())
    )
  );

drop policy if exists transportadora_nos_dono on public.transportadora_nos;
create policy transportadora_nos_dono on public.transportadora_nos
  for all
  using (transportadora_id in (
    select t.id from public.transportadoras t
    where t.loja_id in (select id from public.lojas where owner_id = auth.uid())))
  with check (transportadora_id in (
    select t.id from public.transportadoras t
    where t.loja_id in (select id from public.lojas where owner_id = auth.uid())));

drop policy if exists transportadora_nos_admin on public.transportadora_nos;
create policy transportadora_nos_admin on public.transportadora_nos
  for all using (public.is_admin()) with check (public.is_admin());

create index if not exists transportadora_nos_no_idx on public.transportadora_nos (taxonomia_no_id);

-- Nó removido da árvore: a ligação cai por cascade e, sem nó, a
-- transportadora volta a levar tudo. Marca para o dono revisar.
create or replace function public.taxonomia_no_removido_marca_transportadoras()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.transportadoras t
     set revisar_categorias = true
   where t.id in (select tn.transportadora_id from public.transportadora_nos tn
                  where tn.taxonomia_no_id = old.id);
  return old;
end;
$$;

drop trigger if exists taxonomia_nos_marca_transportadoras on public.taxonomia_nos;
create trigger taxonomia_nos_marca_transportadoras
  before delete on public.taxonomia_nos
  for each row execute function public.taxonomia_no_removido_marca_transportadoras();

-- ============================================================
-- 6. Modo simples: zonas, veículos e grade (D10)
-- ============================================================
create table if not exists public.zonas_cep (
  id          bigint generated always as identity primary key,
  cidade      text not null,
  zona        text not null,
  bairro      text,
  cep_inicial integer not null,
  cep_final   integer not null,
  check (cep_inicial <= cep_final)
);

alter table public.zonas_cep enable row level security;

-- Dado de referência público (faixas de CEP por zona); escrita só por migration.
drop policy if exists zonas_cep_read on public.zonas_cep;
create policy zonas_cep_read on public.zonas_cep for select using (true);

create index if not exists zonas_cep_zona_idx on public.zonas_cep (zona);

create table if not exists public.transportadora_veiculos (
  transportadora_id uuid not null references public.transportadoras (id) on delete cascade,
  veiculo           text not null check (veiculo in ('moto', 'carro', 'utilitario')),
  peso_max          numeric not null check (peso_max > 0),
  altura_max        numeric check (altura_max is null or altura_max > 0),
  largura_max       numeric check (largura_max is null or largura_max > 0),
  comprimento_max   numeric check (comprimento_max is null or comprimento_max > 0),
  primary key (transportadora_id, veiculo)
);

create table if not exists public.transportadora_grade_cd (
  transportadora_id uuid not null references public.transportadoras (id) on delete cascade,
  cd_id             uuid not null references public.centros_distribuicao (id) on delete cascade,
  prazo_min         integer check (prazo_min is null or prazo_min >= 0),
  prazo_max         integer check (prazo_max is null or prazo_max >= 0),
  ad_valorem        numeric not null default 0 check (ad_valorem >= 0),
  icms              numeric not null default 0 check (icms >= 0 and icms < 100),
  frete_minimo      numeric not null default 0 check (frete_minimo >= 0),
  taxa_fixa         numeric not null default 0 check (taxa_fixa >= 0),
  zonas_nao_atendidas text[] not null default '{}',
  atualizado_em     timestamptz not null default now(),
  primary key (transportadora_id, cd_id),
  check (prazo_min is null or prazo_max is null or prazo_min <= prazo_max)
);

create table if not exists public.transportadora_grade_simples (
  transportadora_id uuid not null,
  cd_id             uuid not null,
  zona              text not null,
  veiculo           text not null check (veiculo in ('moto', 'carro', 'utilitario')),
  preco             numeric not null check (preco >= 0),
  primary key (transportadora_id, cd_id, zona, veiculo),
  foreign key (transportadora_id, cd_id)
    references public.transportadora_grade_cd (transportadora_id, cd_id) on delete cascade
);

-- As três tabelas da grade: dono da transportadora e admin; ninguém mais.
do $$
declare
  t text;
begin
  foreach t in array array['transportadora_veiculos', 'transportadora_grade_cd', 'transportadora_grade_simples']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_dono', t);
    execute format($p$
      create policy %I on public.%I for all
      using (transportadora_id in (
        select tr.id from public.transportadoras tr
        where tr.loja_id in (select id from public.lojas where owner_id = auth.uid())))
      with check (transportadora_id in (
        select tr.id from public.transportadoras tr
        where tr.loja_id in (select id from public.lojas where owner_id = auth.uid())))
    $p$, t || '_dono', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin())',
                   t || '_admin', t);
  end loop;
end $$;

-- ============================================================
-- 7. Leitura corrigida: própria ativa deixa de ser pública (D7)
-- ============================================================
-- Antes (0099/0145): `ativo or admin or dono` expunha a transportadora
-- própria ativa, e as faixas dela, a qualquer usuário. O checkout lê por
-- RPC security definer (0101, 0148, 0150), então não depende disto.
drop policy if exists transportadoras_read on public.transportadoras;
create policy transportadoras_read on public.transportadoras
  for select using (
    (loja_id is null and ativo)
    or public.is_admin()
    or loja_id in (select id from public.lojas where owner_id = auth.uid())
  );

drop policy if exists transportadora_faixas_frete_read on public.transportadora_faixas_frete;
create policy transportadora_faixas_frete_read on public.transportadora_faixas_frete
  for select using (
    public.is_admin()
    or loja_id in (select id from public.lojas where owner_id = auth.uid())
    or (loja_id is null and ativo and transportadora_id in (
          select id from public.transportadoras where loja_id is null and ativo))
  );

-- Escrita direta de faixa pelo seller sai: a tabela troca inteira pela RPC
-- abaixo, que valida sobreposição. Admin mantém a policy da 0145.
drop policy if exists transportadora_faixas_frete_seller_own on public.transportadora_faixas_frete;
create policy transportadora_faixas_frete_seller_own on public.transportadora_faixas_frete
  for update
  using (loja_id in (select id from public.lojas where owner_id = auth.uid()))
  with check (loja_id in (select id from public.lojas where owner_id = auth.uid()));

-- O update direto do seller serve só para ligar e desligar uma faixa. Mudar
-- CEP, peso, valor ou CD pularia a checagem de sobreposição da RPC; religar
-- uma faixa é revalidado aqui.
create or replace function public.transportadora_faixa_guarda_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;
  if (to_jsonb(new) - 'ativo') is distinct from (to_jsonb(old) - 'ativo') then
    raise exception 'O seller só liga ou desliga a faixa; para mudar valores, suba a tabela de novo.';
  end if;
  if new.ativo and not old.ativo and exists (
    select 1 from public.transportadora_faixas_frete o
    where o.transportadora_id = new.transportadora_id and o.ativo and o.id <> new.id
      and o.veiculo is not distinct from new.veiculo
      and int4range(o.cep_destino_inicial, o.cep_destino_final, '[]')
          && int4range(new.cep_destino_inicial, new.cep_destino_final, '[]')
      and int4range(o.cep_origem_inicial, o.cep_origem_final, '[]')
          && int4range(new.cep_origem_inicial, new.cep_origem_final, '[]')
      and numrange(o.peso_min, o.peso_max, '[]') && numrange(new.peso_min, new.peso_max, '[]')
  ) then
    raise exception 'Religar esta faixa a sobrepõe a outra faixa ativa.';
  end if;
  return new;
end;
$$;

drop trigger if exists transportadora_faixas_guarda_update on public.transportadora_faixas_frete;
create trigger transportadora_faixas_guarda_update
  before update on public.transportadora_faixas_frete
  for each row execute function public.transportadora_faixa_guarda_update();

-- ============================================================
-- 8. Substituição atômica da tabela (D4, D5)
-- ============================================================
-- p_faixas: array de objetos com cep_origem_inicial, cep_origem_final,
-- cep_destino_inicial, cep_destino_final, peso_min, peso_max, valor,
-- prazo_min, prazo_max, ad_valorem, kg_adicional, icms, frete_minimo,
-- taxa_fixa, veiculo. Com p_cd_id, troca só as faixas da grade daquele CD.
create or replace function public.substituir_faixas_transportadora(
  p_transportadora_id uuid,
  p_faixas jsonb,
  p_cd_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_t public.transportadoras%rowtype;
  v_cd public.centros_distribuicao%rowtype;
  v_admin boolean := public.is_admin();
  v_qtd integer;
  v_conflito record;
begin
  select * into v_t from public.transportadoras where id = p_transportadora_id;
  if not found then
    raise exception 'Transportadora não encontrada.';
  end if;

  if v_t.loja_id is null then
    if not v_admin then
      raise exception 'Só o admin altera a tabela de transportadora global.';
    end if;
  else
    if not v_admin and not exists (
      select 1 from public.lojas l where l.id = v_t.loja_id and l.owner_id = auth.uid()
    ) then
      raise exception 'Transportadora de outra loja.';
    end if;
    if v_t.desativada_por_admin and not v_admin then
      raise exception 'Transportadora desativada pelo admin.';
    end if;
  end if;

  -- p_faixas nulo passaria pelo IF (NULL não é verdadeiro) e apagaria a tabela.
  if p_faixas is null or jsonb_typeof(p_faixas) <> 'array' or jsonb_array_length(p_faixas) = 0 then
    raise exception 'Tabela sem faixas.';
  end if;
  if jsonb_array_length(p_faixas) > 15000 then
    raise exception 'Tabela com mais de 15.000 faixas.';
  end if;

  if p_cd_id is not null then
    select * into v_cd from public.centros_distribuicao where id = p_cd_id;
    if not found or v_cd.loja_id is distinct from v_t.loja_id then
      raise exception 'CD não pertence à loja da transportadora.';
    end if;
    if v_cd.cep is null then
      raise exception 'CD sem CEP não pode ser origem de frete.';
    end if;
    delete from public.transportadora_faixas_frete
     where transportadora_id = p_transportadora_id and cd_id = p_cd_id;
  else
    delete from public.transportadora_faixas_frete
     where transportadora_id = p_transportadora_id and cd_id is null;
  end if;

  insert into public.transportadora_faixas_frete (
    transportadora_id, cd_id, cep_origem_inicial, cep_origem_final,
    cep_destino_inicial, cep_destino_final, peso_min, peso_max, valor,
    prazo_min, prazo_max, ad_valorem, kg_adicional, icms, frete_minimo,
    taxa_fixa, veiculo
  )
  select p_transportadora_id, p_cd_id,
         coalesce(f.cep_origem_inicial, case when p_cd_id is not null then v_cd.cep end),
         coalesce(f.cep_origem_final, case when p_cd_id is not null then v_cd.cep end),
         f.cep_destino_inicial, f.cep_destino_final, coalesce(f.peso_min, 0), f.peso_max, f.valor,
         f.prazo_min, f.prazo_max, coalesce(f.ad_valorem, 0), coalesce(f.kg_adicional, 0),
         coalesce(f.icms, 0), coalesce(f.frete_minimo, 0), coalesce(f.taxa_fixa, 0), f.veiculo
  from jsonb_to_recordset(p_faixas) as f(
    cep_origem_inicial integer, cep_origem_final integer,
    cep_destino_inicial integer, cep_destino_final integer,
    peso_min numeric, peso_max numeric, valor numeric,
    prazo_min integer, prazo_max integer, ad_valorem numeric, kg_adicional numeric,
    icms numeric, frete_minimo numeric, taxa_fixa numeric, veiculo text
  );
  get diagnostics v_qtd = row_count;

  -- CEP de 8 dígitos (o check da 0176 aceita a partir de 01000-000) e peso
  -- positivo; o parser já barra, aqui é a garantia para chamada direta.
  if exists (
    select 1 from public.transportadora_faixas_frete
    where transportadora_id = p_transportadora_id
      and (cep_destino_inicial not between 1000000 and 99999999
           or cep_destino_final not between 1000000 and 99999999
           or cep_origem_inicial not between 1000000 and 99999999
           or cep_origem_final not between 1000000 and 99999999
           or cep_destino_inicial > cep_destino_final
           or peso_max <= 0)
  ) then
    raise exception 'Faixa com CEP fora de 01000-000 a 99999-999, CEP invertido ou peso máximo não positivo.';
  end if;

  -- Sobreposição no conjunto final da transportadora: mesma origem, destino
  -- e peso. Veículos diferentes da grade são alternativas, não conflito.
  -- Recria a temporária a cada chamada: uma _faixas_chk criada antes pelo
  -- chamador (com trigger próprio) não é reaproveitada.
  drop table if exists pg_temp._faixas_chk;
  create temp table _faixas_chk (
    id uuid, o int4range, d int4range, p numrange, v text
  ) on commit drop;
  insert into pg_temp._faixas_chk
  select id,
         int4range(cep_origem_inicial, cep_origem_final, '[]'),
         int4range(cep_destino_inicial, cep_destino_final, '[]'),
         numrange(peso_min, peso_max, '[]'),
         veiculo
  from public.transportadora_faixas_frete
  where transportadora_id = p_transportadora_id and ativo;
  create index _faixas_chk_d on pg_temp._faixas_chk using gist (d);
  analyze pg_temp._faixas_chk;

  select a.d as destino, a.p as peso into v_conflito
  from pg_temp._faixas_chk a
  join pg_temp._faixas_chk b
    on a.id < b.id and a.d && b.d and a.o && b.o and a.p && b.p
   and a.v is not distinct from b.v
  limit 1;
  if found then
    raise exception 'Faixas sobrepostas: destino %, peso %.', v_conflito.destino, v_conflito.peso;
  end if;

  update public.transportadoras
     set tabela_atualizada_em = now(),
         -- cotar_frete_tabela (0148) e o checkout (0150) só leem faixas de
         -- fonte tabela_importada; só integrações por API mantêm a fonte.
         fonte = case when fonte in ('mercado_envios', 'uber_direct') then fonte else 'tabela_importada' end
   where id = p_transportadora_id;

  return v_qtd;
end;
$$;

revoke all on function public.substituir_faixas_transportadora(uuid, jsonb, uuid) from public, anon;
grant execute on function public.substituir_faixas_transportadora(uuid, jsonb, uuid) to authenticated;

comment on function public.substituir_faixas_transportadora(uuid, jsonb, uuid) is
  'Troca a tabela de faixas de uma transportadora (ou só a grade de um CD) numa transação, recusando sobreposição. PRD 049 M1.';
