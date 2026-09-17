-- 0184: arvore de taxonomia importavel (PRD 041, Milestone 1).
--
-- Aditiva por decisao de projeto: NAO toca em categorias, subcategorias nem
-- produtos, e nao e lida por checkout_criar_pedido. A comissao de venda continua
-- vindo inteira de comissao_pct_item (0180). Enquanto o PRD 041 nao chegar ao
-- Milestone 3, esta arvore e catalogo de referencia, nao fonte de preco.
--
-- Motivo da tabela propria em vez de parent_id nas tabelas existentes: a 0182
-- reconstroi categorias/subcategorias na mesma janela, e escrever nas mesmas
-- tabelas colidiria. Alem disso mantem o caminho aberto para qualquer das duas
-- decisoes de taxonomia sem migration destrutiva.

create table if not exists public.taxonomia_nos (
  id uuid primary key default gen_random_uuid(),
  -- 'google' para no importado, 'local' para no criado a mao (PRD 041 US04).
  origem text not null default 'google' check (origem in ('google', 'local')),
  -- id estavel da fonte. A importacao casa por ele, nunca por nome: o Google
  -- renomeia rotulo e mantem id.
  origem_id text,
  nome text not null,
  -- apelido prevalece sobre nome em toda exibicao; e trabalho de curadoria da
  -- plataforma e a importacao nunca o sobrescreve.
  apelido text,
  parent_id uuid references public.taxonomia_nos(id) on delete restrict,
  -- caminho completo em nomes ('A > B > C'). E a chave natural da arvore e o
  -- que permite herdar comissao subindo sem recursao a cada leitura.
  caminho text not null unique,
  nivel int not null check (nivel >= 1),
  visivel_vitrine boolean not null default true,
  selecionavel boolean not null default true,
  -- no que sumiu de uma revisao futura da fonte mas nao pode ser apagado.
  obsoleto boolean not null default false,
  comissao_pct numeric(5,2) check (comissao_pct >= 0 and comissao_pct <= 100),
  criado_em timestamptz not null default now()
);

create unique index if not exists taxonomia_nos_origem_id_uidx
  on public.taxonomia_nos (origem, origem_id)
  where origem_id is not null;
create index if not exists taxonomia_nos_parent_idx on public.taxonomia_nos (parent_id);
create index if not exists taxonomia_nos_nivel_idx on public.taxonomia_nos (nivel);

comment on table public.taxonomia_nos is
  'Arvore de categorias de profundidade livre (PRD 041). Aditiva: nao substitui categorias/subcategorias.';

-- Historico de importacoes. Responde "de onde veio essa categoria" meses depois.
create table if not exists public.taxonomia_importacoes (
  id uuid primary key default gen_random_uuid(),
  versao text,
  origem text not null default 'google',
  autor uuid,
  linhas int not null default 0,
  nos_novos int not null default 0,
  nos_existentes int not null default 0,
  nos_obsoletos int not null default 0,
  criado_em timestamptz not null default now()
);

alter table public.taxonomia_nos enable row level security;
alter table public.taxonomia_importacoes enable row level security;

-- Leitura publica: a arvore e catalogo, nao dado sensivel, e a vitrine precisa
-- dela. Escrita so por service_role e pelas funcoes security definer abaixo.
drop policy if exists taxonomia_nos_select on public.taxonomia_nos;
create policy taxonomia_nos_select on public.taxonomia_nos
  for select using (true);

drop policy if exists taxonomia_importacoes_select on public.taxonomia_importacoes;
create policy taxonomia_importacoes_select on public.taxonomia_importacoes
  for select using (auth.role() = 'authenticated');

-- Parser do formato da fonte: uma linha por no, "<id> - A > B > C".
-- Linhas iniciadas por '#' sao comentario (a primeira carrega a versao).
create or replace function public.taxonomia_parse(p_conteudo text)
returns table (origem_id text, caminho text, nome text, nivel int)
language sql
immutable
as $$
  with linhas as (
    select trim(l) as l
    from regexp_split_to_table(coalesce(p_conteudo, ''), E'\r?\n') as l
  ),
  uteis as (
    select l from linhas where l <> '' and left(l, 1) <> '#'
  ),
  partido as (
    select
      nullif(trim(split_part(l, ' - ', 1)), '') as oid,
      trim(substr(l, strpos(l, ' - ') + 3)) as cam
    from uteis
    where strpos(l, ' - ') > 0
  )
  select
    oid,
    cam,
    trim(split_part(cam, ' > ', array_length(string_to_array(cam, ' > '), 1))),
    array_length(string_to_array(cam, ' > '), 1)
  from partido
  where cam <> '';
$$;

-- Previa: pura leitura, nao grava nada. E o que a tela mostra antes de confirmar.
create or replace function public.taxonomia_importar_previa(p_conteudo text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with arq as (select * from public.taxonomia_parse(p_conteudo)),
  atual as (select * from public.taxonomia_nos where origem = 'google')
  select jsonb_build_object(
    'linhas', (select count(*) from arq),
    'novos', (select count(*) from arq a
              where not exists (select 1 from atual t where t.origem_id = a.origem_id)),
    'existentes', (select count(*) from arq a
              where exists (select 1 from atual t where t.origem_id = a.origem_id)),
    'ausentes', (select count(*) from atual t
              where not exists (select 1 from arq a where a.origem_id = t.origem_id)),
    'nos_proprios_preservados', (select count(*) from public.taxonomia_nos where origem = 'local'),
    'comissoes_preservadas', (select count(*) from public.taxonomia_nos where comissao_pct is not null),
    'apelidos_preservados', (select count(*) from public.taxonomia_nos where apelido is not null),
    -- Nenhum produto aponta para esta arvore no Milestone 1, entao a importacao
    -- nao pode alterar comissao efetiva de ninguem. O campo existe porque a tela
    -- bloqueia a importacao quando ele for diferente de zero (PRD 041 US01).
    'produtos_afetados', 0,
    'comissao_efetiva_alterada', 0,
    'versao', (
      select trim(substr(l, strpos(l, ':') + 1))
      from regexp_split_to_table(coalesce(p_conteudo, ''), E'\r?\n') as l
      where left(trim(l), 1) = '#' and strpos(l, 'Version') > 0
      limit 1
    )
  );
$$;

-- Aplicacao. Uma transacao: ou a arvore inteira entra, ou nada entra.
-- Idempotente por (origem, origem_id). Nunca sobrescreve comissao, apelido,
-- visibilidade nem selecionabilidade de no ja existente.
create or replace function public.taxonomia_importar(p_conteudo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previa jsonb;
  v_nivel int;
  v_max int;
  v_obsoletos int;
begin
  v_previa := public.taxonomia_importar_previa(p_conteudo);

  if (v_previa->>'linhas')::int = 0 then
    raise exception 'Arquivo sem nos reconheciveis. Esperado "<id> - A > B > C" por linha.';
  end if;

  create temp table _arq on commit drop as
    select * from public.taxonomia_parse(p_conteudo);

  select max(nivel) into v_max from _arq;

  -- Insere nivel a nivel para que o pai ja exista quando o filho entrar.
  for v_nivel in 1..v_max loop
    insert into public.taxonomia_nos (origem, origem_id, nome, parent_id, caminho, nivel)
    select
      'google',
      a.origem_id,
      a.nome,
      p.id,
      a.caminho,
      a.nivel
    from _arq a
    left join public.taxonomia_nos p
      on p.caminho = left(a.caminho, length(a.caminho) - length(a.nome) - 3)
     and a.nivel > 1
    where a.nivel = v_nivel
      and not exists (
        select 1 from public.taxonomia_nos t
        where t.origem = 'google' and t.origem_id = a.origem_id
      )
    on conflict (caminho) do nothing;
  end loop;

  -- No que sumiu da fonte vira obsoleto, nunca e apagado: apagar categoria com
  -- produto deixaria produto sem comissao definida.
  update public.taxonomia_nos t
  set obsoleto = true, selecionavel = false
  where t.origem = 'google'
    and not exists (select 1 from _arq a where a.origem_id = t.origem_id)
    and t.obsoleto = false;
  get diagnostics v_obsoletos = row_count;

  insert into public.taxonomia_importacoes
    (versao, origem, autor, linhas, nos_novos, nos_existentes, nos_obsoletos)
  values (
    v_previa->>'versao',
    'google',
    auth.uid(),
    (v_previa->>'linhas')::int,
    (v_previa->>'novos')::int,
    (v_previa->>'existentes')::int,
    v_obsoletos
  );

  return v_previa || jsonb_build_object('obsoletos', v_obsoletos, 'aplicado', true);
end;
$$;

-- Percentual efetivo de um no: o do ancestral mais proximo que tenha proprio.
-- NULL herda, 0 e comissao nula deliberada, e os dois sao distintos. Mesma
-- semantica de comissao_pct_item (0180), generalizada para profundidade livre.
create or replace function public.taxonomia_comissao_pct(p_no_id uuid)
returns numeric
language sql
stable
as $$
  with recursive sobe as (
    select id, parent_id, comissao_pct, 0 as passo
    from public.taxonomia_nos where id = p_no_id
    union all
    select t.id, t.parent_id, t.comissao_pct, s.passo + 1
    from public.taxonomia_nos t
    join sobe s on t.id = s.parent_id
    where s.comissao_pct is null
  )
  select coalesce(
    (select comissao_pct from sobe where comissao_pct is not null order by passo limit 1),
    5.00
  );
$$;

revoke all on function public.taxonomia_importar(text) from public, anon;
revoke all on function public.taxonomia_importar_previa(text) from public, anon;
