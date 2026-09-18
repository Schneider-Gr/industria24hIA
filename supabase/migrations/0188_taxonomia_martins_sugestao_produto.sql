-- 0188: taxonomia multi-fonte (Google + Martins), nó da árvore no produto e
-- sugestão de categoria pelo nome.
--
-- Continua fora do caminho do dinheiro: checkout_criar_pedido segue lendo só
-- categoria_id/subcategoria_id via comissao_pct_item (0180). produtos.taxonomia_no_id
-- é classificação de catálogo até o Milestone 3 do PRD 041.

-- 1. Martins como segunda fonte.
alter table public.taxonomia_nos drop constraint if exists taxonomia_nos_origem_check;
alter table public.taxonomia_nos
  add constraint taxonomia_nos_origem_check check (origem in ('google', 'martins', 'local'));

-- 2. Importação parametrizada pela fonte. Troca a assinatura (text) por
-- (text, text): manter as duas deixaria a chamada de 1 argumento ambígua.
drop function if exists public.taxonomia_importar(text);
drop function if exists public.taxonomia_importar_previa(text);

create or replace function public.taxonomia_importar_previa(p_conteudo text, p_origem text default 'google')
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with arq as (select * from public.taxonomia_parse(p_conteudo)),
  atual as (select * from public.taxonomia_nos where origem = p_origem)
  select jsonb_build_object(
    'origem', p_origem,
    'linhas', (select count(*) from arq),
    'novos', (select count(*) from arq a
              where not exists (select 1 from atual t where t.origem_id = a.origem_id)
                and not exists (select 1 from public.taxonomia_nos t where t.caminho = a.caminho)),
    -- Mesmo caminho vindo de outra fonte: o nó existente é reaproveitado e os
    -- filhos desta fonte penduram nele.
    'fundidos', (select count(*) from arq a
              where not exists (select 1 from atual t where t.origem_id = a.origem_id)
                and exists (select 1 from public.taxonomia_nos t where t.caminho = a.caminho)),
    'existentes', (select count(*) from arq a
              where exists (select 1 from atual t where t.origem_id = a.origem_id)),
    'ausentes', (select count(*) from atual t
              where not exists (select 1 from arq a where a.origem_id = t.origem_id)),
    'nos_proprios_preservados', (select count(*) from public.taxonomia_nos where origem = 'local'),
    'comissoes_preservadas', (select count(*) from public.taxonomia_nos where comissao_pct is not null),
    'apelidos_preservados', (select count(*) from public.taxonomia_nos where apelido is not null),
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

create or replace function public.taxonomia_importar(p_conteudo text, p_origem text default 'google')
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
  if p_origem not in ('google', 'martins') then
    raise exception 'Fonte desconhecida: %', p_origem;
  end if;

  v_previa := public.taxonomia_importar_previa(p_conteudo, p_origem);

  if (v_previa->>'linhas')::int = 0 then
    raise exception 'Arquivo sem nos reconheciveis. Esperado "<id> - A > B > C" por linha.';
  end if;

  create temp table _arq on commit drop as
    select * from public.taxonomia_parse(p_conteudo);

  select max(nivel) into v_max from _arq;

  for v_nivel in 1..v_max loop
    insert into public.taxonomia_nos (origem, origem_id, nome, parent_id, caminho, nivel)
    select p_origem, a.origem_id, a.nome, p.id, a.caminho, a.nivel
    from _arq a
    left join public.taxonomia_nos p
      on p.caminho = left(a.caminho, length(a.caminho) - length(a.nome) - 3)
     and a.nivel > 1
    where a.nivel = v_nivel
      and not exists (
        select 1 from public.taxonomia_nos t
        where t.origem = p_origem and t.origem_id = a.origem_id
      )
    on conflict (caminho) do nothing;
  end loop;

  update public.taxonomia_nos t
  set obsoleto = true, selecionavel = false
  where t.origem = p_origem
    and not exists (select 1 from _arq a where a.origem_id = t.origem_id)
    and t.obsoleto = false;
  get diagnostics v_obsoletos = row_count;

  insert into public.taxonomia_importacoes
    (versao, origem, autor, linhas, nos_novos, nos_existentes, nos_obsoletos)
  values (
    v_previa->>'versao', p_origem, auth.uid(),
    (v_previa->>'linhas')::int, (v_previa->>'novos')::int,
    (v_previa->>'existentes')::int, v_obsoletos
  );

  return v_previa || jsonb_build_object('obsoletos', v_obsoletos, 'aplicado', true);
end;
$$;

revoke all on function public.taxonomia_importar(text, text) from public, anon;
revoke all on function public.taxonomia_importar_previa(text, text) from public, anon;

-- 3. Nó da árvore no produto. Anulável e set null: nó apagado não derruba produto.
alter table public.produtos
  add column if not exists taxonomia_no_id uuid references public.taxonomia_nos(id) on delete set null;
create index if not exists produtos_taxonomia_no_idx on public.produtos (taxonomia_no_id);

-- 4. Sugestão pelo nome do produto.
--    subcategoria: voto dos produtos já classificados com nome parecido. O
--      catálogo real (hortifrúti, alvenaria, polpa) não existe nas árvores
--      prontas, então o melhor preditor é o que a plataforma já classificou.
--    no: nós cujo PRÓPRIO nome casa com o texto (casar pelo caminho inteiro
--      trazia "viva" -> "viva-voz" e "baby" -> "Babydolls"), mais o nó dos
--      produtos parecidos quando eles já tiverem um.
-- ponytail: full-text português sem unaccent; embedding se a precisão incomodar.
create or replace function public.taxonomia_sugerir(p_texto text, p_limite int default 5)
returns table (tipo text, id uuid, caminho text, categoria_id uuid, score real)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select to_tsquery('portuguese', string_agg(w, ' | ')) as tsq
    from (
      select distinct lower(w) as w
      from regexp_split_to_table(coalesce(p_texto, ''), '[^[:alnum:]]+') as w
      where length(w) >= 3
    ) p
    having count(*) > 0
  ),
  parecidos as (
    select p.subcategoria_id, p.taxonomia_no_id,
      ts_rank(to_tsvector('portuguese', p.nome), q.tsq) as r
    from public.produtos p, q
    where to_tsvector('portuguese', p.nome) @@ q.tsq
      and p.status_produto <> 'rascunho'
    order by r desc
    limit 30
  ),
  subs as (
    select 'subcategoria'::text as tipo, s.id, c.nome || ' > ' || s.nome as caminho,
      s.categoria_id, sum(x.r)::real as score
    from parecidos x
    join public.subcategorias s on s.id = x.subcategoria_id
    join public.categorias c on c.id = s.categoria_id
    group by s.id, c.nome, s.nome, s.categoria_id
  ),
  nos as (
    select t.id, t.caminho,
      ts_rank(to_tsvector('portuguese', coalesce(t.apelido, t.nome)), q.tsq) * (1 + t.nivel * 0.1) as score
    from public.taxonomia_nos t, q
    where t.selecionavel and not t.obsoleto
      and to_tsvector('portuguese', coalesce(t.apelido, t.nome)) @@ q.tsq
    union all
    select t.id, t.caminho, sum(x.r) * 10
    from parecidos x join public.taxonomia_nos t on t.id = x.taxonomia_no_id
    group by t.id, t.caminho
  ),
  nos_agg as (
    select 'no'::text as tipo, id, caminho, null::uuid as categoria_id, sum(score)::real as score
    from nos group by id, caminho
  )
  (select * from subs order by score desc limit p_limite)
  union all
  (select * from nos_agg order by score desc, length(caminho) limit p_limite);
$$;

revoke all on function public.taxonomia_sugerir(text, int) from public, anon;
grant execute on function public.taxonomia_sugerir(text, int) to authenticated;
