-- Link amigável de produto: /produto/broa-de-milho em vez de /produto/<uuid>-broa-de-milho.
--
-- O slug é gerado UMA vez (na criação) e não acompanha renomeação: link de
-- afiliado, QR code e resultado do Google nunca quebram. Nome repetido
-- (o mesmo café em 12 lojas) ganha sufixo -2, -3... por ordem de criação.
-- A URL antiga com UUID continua valendo: a página redireciona (308) para o slug.

alter table public.produtos add column if not exists slug text;

create or replace function public.slugify_texto(txt text)
returns text
language sql
immutable
as $$
  select coalesce(nullif(
    left(
      trim(both '-' from regexp_replace(
        lower(translate(coalesce(txt, ''),
          'áàâãäåÁÀÂÃÄÅéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇñÑ',
          'aaaaaaAAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnN')),
        '[^a-z0-9]+', '-', 'g')),
      80),
    ''), 'produto')
$$;

-- ponytail: laço de "existe?" sem lock; duas criações simultâneas do mesmo
-- nome no mesmo instante esbarram no índice único (erro raro, basta salvar de
-- novo). Trocar por advisory lock se o cadastro em lote passar a colidir.
create or replace function public.gerar_slug_produto(p_nome text, p_id uuid)
returns text
language plpgsql
as $$
declare
  base text := rtrim(public.slugify_texto(p_nome), '-');
  candidato text := base;
  n int := 1;
begin
  while exists (select 1 from public.produtos where slug = candidato and id <> p_id) loop
    n := n + 1;
    candidato := base || '-' || n;
  end loop;
  return candidato;
end;
$$;

create or replace function public.produtos_define_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.gerar_slug_produto(new.nome, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists produtos_define_slug on public.produtos;
create trigger produtos_define_slug
  before insert or update of slug on public.produtos
  for each row execute function public.produtos_define_slug();

-- Backfill: o mais antigo fica com o slug limpo.
do $$
declare r record;
begin
  for r in select id, nome from public.produtos where slug is null order by created_at, id loop
    update public.produtos set slug = public.gerar_slug_produto(r.nome, r.id) where id = r.id;
  end loop;
end $$;

alter table public.produtos alter column slug set not null;
create unique index if not exists produtos_slug_key on public.produtos (slug);
