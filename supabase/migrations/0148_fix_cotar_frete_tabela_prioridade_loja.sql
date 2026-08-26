-- 0148: corrige cotar_frete_tabela (0146) — a faixa global (loja_id null)
-- vencia o override da loja porque `f.loja_id = p_loja_id` avalia para NULL
-- quando f.loja_id é null, e Postgres ordena NULL primeiro em `DESC` por
-- padrão (NULLS FIRST), fazendo a faixa global "ganhar" mesmo com override
-- presente. Achado ao rodar a verificação E2E da spec change
-- transportadoras-tabela-frete-upload (tasks.md §7.2) antes de fechar o
-- change. `IS NOT DISTINCT FROM` devolve boolean sempre (nunca NULL).

create or replace function public.cotar_frete_tabela(p_loja_id uuid, p_cep int, p_peso numeric)
returns table (transportadora_id uuid, valor numeric)
language sql
stable
security definer
set search_path = public
as $$
  select f.transportadora_id, f.valor
  from transportadora_faixas_frete f
  join transportadoras t on t.id = f.transportadora_id
  where f.ativo
    and t.ativo
    and t.fonte = 'tabela_importada'
    and (t.loja_id = p_loja_id or t.loja_id is null)
    and (f.loja_id = p_loja_id or f.loja_id is null)
    and p_cep between f.cep_destino_inicial and f.cep_destino_final
    and p_peso between f.peso_min and f.peso_max
  order by f.transportadora_id, (f.loja_id is not distinct from p_loja_id) desc
  limit 1;
$$;
