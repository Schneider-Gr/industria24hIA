-- 0182: taxonomia do catalogo e reclassificacao dos produtos (PRD 037).
--
-- A taxonomia anterior tinha 10 categorias com duplicata (Fertilizante duas
-- vezes), eixos sobrepostos (Legumes e Verduras irmas de Supermercado) e lixo
-- em producao (Teste). 117 dos 223 produtos estavam sem categoria, o que torna
-- a comissao por categoria da 0180 inerte sobre metade do catalogo.
--
-- Arvore nova: 5 categorias e 22 subcategorias, autoradas a partir do catalogo
-- real. Todos os comissao_pct nascem NULL, herdando o padrao de 5%: nenhum
-- preco efetivo muda ao aplicar esta migration.
--
-- A classificacao casa PALAVRA INTEIRA (\y). Substring erra em silencio:
-- "hortela" contem "tela", e 6 produtos de hortela foram parar em "Estufa e
-- telas" na primeira simulacao.

-- 1. Arvore nova, idempotente pelo nome.
insert into public.categorias (nome)
select v.nome from (values
  ('Hortifrúti'),
  ('Alimentos e bebidas'),
  ('Material de construção'),
  ('Agro'),
  ('Pet')
) as v(nome)
where not exists (select 1 from public.categorias c where c.nome = v.nome);

insert into public.subcategorias (categoria_id, nome)
select c.id, v.sub from (values
  ('Hortifrúti', 'Folhosas e verduras'),
  ('Hortifrúti', 'Ervas e temperos frescos'),
  ('Hortifrúti', 'Regionais e amazônicos'),
  ('Hortifrúti', 'Mudas e bandejas'),
  ('Alimentos e bebidas', 'Polpas e congelados'),
  ('Alimentos e bebidas', 'Café'),
  ('Alimentos e bebidas', 'Panificação'),
  ('Alimentos e bebidas', 'Sorvetes e geladinhos'),
  ('Material de construção', 'Cobertura'),
  ('Material de construção', 'Alvenaria e blocos'),
  ('Material de construção', 'Cimento e argamassa'),
  ('Material de construção', 'Agregados'),
  ('Material de construção', 'Revestimentos'),
  ('Material de construção', 'Hidráulica'),
  ('Material de construção', 'Ferro e aço'),
  ('Material de construção', 'Tintas'),
  ('Material de construção', 'Madeira'),
  ('Agro', 'Sementes'),
  ('Agro', 'Estufa e telas'),
  ('Agro', 'Substratos'),
  ('Agro', 'Fertilizantes e defensivos'),
  ('Pet', 'Ração')
) as v(cat, sub)
join public.categorias c on c.nome = v.cat
where not exists (
  select 1 from public.subcategorias s where s.nome = v.sub and s.categoria_id = c.id
);

-- 2. Reclassificacao por nome. A ordem do CASE e a ordem de prioridade: a
--    primeira regra que casa vence, do no mais especifico para o mais generico.
with alvo as (
  select p.id as produto_id,
    case
      when n ~ '\ysementes?\y' then 'Sementes'
      when n ~ '\ytela\y|\ysombrite\y|\yestufa\y|\ysombreamento\y' then 'Estufa e telas'
      when n ~ '\ysubstrato\y|\yfibra de coco\y' then 'Substratos'
      when n ~ '\yfertilizante\y|\ysulfato\y|\ythyper\y|\yfosfato\y' then 'Fertilizantes e defensivos'
      when n ~ '\ymudas\y|\ybandeja\y' then 'Mudas e bandejas'
      when n ~ '\ypolpa\y|\ypre cozido\y' then 'Polpas e congelados'
      when n ~ '\yjambu\y' then 'Regionais e amazônicos'
      when n ~ '\ycoentro\y|\ycebolinha\y|\ysalsa\y|\ycheiro verde\y|\ymanjericao\y|\yhortela\y' then 'Ervas e temperos frescos'
      when n ~ '\yalface\y|\ycouve\y|\yalmeirao\y|\yrucula\y|\yagriao\y|\yacelga\y|\ychicoria\y' then 'Folhosas e verduras'
      when n ~ '\ycafe\y' then 'Café'
      when n ~ '\ypao\y|\ybaguete\y|\ycroissant\y|\ybroa\y' then 'Panificação'
      when n ~ '\ygeladinho\y|\ysacole\y|\yyupi\y|\ytim-tim\y|\ytita\y' then 'Sorvetes e geladinhos'
      when n ~ '\ytelha\y' then 'Cobertura'
      when n ~ '\ytijolo\y|\ybloco\y' then 'Alvenaria e blocos'
      when n ~ '\ycimento\y|\yargamassa\y' then 'Cimento e argamassa'
      when n ~ '\yareia\y|\ybrita\y' then 'Agregados'
      when n ~ '\yporcelanato\y|\ypiso\y' then 'Revestimentos'
      when n ~ '\ypvc\y|\ytubo\y' then 'Hidráulica'
      when n ~ '\yvergalhao\y' then 'Ferro e aço'
      when n ~ '\ytinta\y' then 'Tintas'
      when n ~ '\ydeck\y|\ymadeira\y' then 'Madeira'
      when n ~ '\yracao\y|\ynutrak\y' then 'Ração'
    end as sub_nome
  from public.produtos p
  cross join lateral (
    select translate(lower(p.nome), 'áàâãéêíóôõúüç', 'aaaaeeiooouuc') as n
  ) t
)
update public.produtos p
set subcategoria_id = s.id,
    categoria_id = s.categoria_id
from alvo a
join public.subcategorias s on s.nome = a.sub_nome
join public.categorias c on c.id = s.categoria_id
where p.id = a.produto_id and a.sub_nome is not null;

-- 3. Lixo fora da vitrine, sem apagar: um dos 7 tem historico de venda, e
--    apagar produto com linha_itens quebraria o extrato. 'Recusado' e o
--    mecanismo de curadoria que ja existe e e reversivel.
update public.produtos
set status_produto = 'Recusado'
where nome ilike '%rascunho%' or nome ilike '%teste produto%' or nome ilike '%- copia%';

-- 4. Remove os nos antigos que ficaram sem produto. Verificado em 17/09 que
--    nenhuma regra de cupom aponta para categoria (cupom_regras so tem alvo
--    'loja' e 'produto'), entao a remocao nao derruba cupom.
delete from public.subcategorias s
where not exists (select 1 from public.produtos p where p.subcategoria_id = s.id)
  and not exists (
    select 1 from (values
  ('Hortifrúti', 'Folhosas e verduras'),
  ('Hortifrúti', 'Ervas e temperos frescos'),
  ('Hortifrúti', 'Regionais e amazônicos'),
  ('Hortifrúti', 'Mudas e bandejas'),
  ('Alimentos e bebidas', 'Polpas e congelados'),
  ('Alimentos e bebidas', 'Café'),
  ('Alimentos e bebidas', 'Panificação'),
  ('Alimentos e bebidas', 'Sorvetes e geladinhos'),
  ('Material de construção', 'Cobertura'),
  ('Material de construção', 'Alvenaria e blocos'),
  ('Material de construção', 'Cimento e argamassa'),
  ('Material de construção', 'Agregados'),
  ('Material de construção', 'Revestimentos'),
  ('Material de construção', 'Hidráulica'),
  ('Material de construção', 'Ferro e aço'),
  ('Material de construção', 'Tintas'),
  ('Material de construção', 'Madeira'),
  ('Agro', 'Sementes'),
  ('Agro', 'Estufa e telas'),
  ('Agro', 'Substratos'),
  ('Agro', 'Fertilizantes e defensivos'),
  ('Pet', 'Ração')
    ) as v(cat, sub) where v.sub = s.nome
  );

delete from public.categorias c
where not exists (select 1 from public.produtos p where p.categoria_id = c.id)
  and not exists (select 1 from public.subcategorias s where s.categoria_id = c.id)
  and c.nome not in ('Hortifrúti', 'Alimentos e bebidas', 'Material de construção', 'Agro', 'Pet');
