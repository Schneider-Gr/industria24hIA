-- Seed da taxonomia real (categorias + subcategorias vistas no painel /seller).
-- Idempotente.
insert into public.categorias (nome) values
  ('Supermercado'),('Pet Shop'),('Material de Construção'),('Verduras'),
  ('Legumes'),('Madeira'),('Agro'),('Combustíveis'),('Eletrodomésticos')
on conflict (nome) do nothing;

insert into public.subcategorias (categoria_id, nome)
select c.id, s.nome from (values
  ('Verduras','hortaliças'),
  ('Pet Shop','Ração'),
  ('Agro','Fertilizante'),
  ('Material de Construção','Tijolo')
) as s(cat, nome)
join public.categorias c on c.nome = s.cat
where not exists (
  select 1 from public.subcategorias sx
  where sx.categoria_id = c.id and sx.nome = s.nome
);
