-- 0146: RPC de cotação por tabela de frete importada (0145). Espelha o
-- padrão de cotar_frete_interno (0140): só transportadoras fonte =
-- 'tabela_importada', prioriza faixa da própria loja sobre a faixa global
-- equivalente. Peso do carrinho usa o mesmo placeholder de 1kg já registrado
-- em docs/prd/fluxo-frete-completo.md (só 89/358 produtos têm peso real).

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
  order by f.transportadora_id, (f.loja_id = p_loja_id) desc
  limit 1;
$$;

revoke all on function public.cotar_frete_tabela(uuid, int, numeric) from public;
grant execute on function public.cotar_frete_tabela(uuid, int, numeric) to authenticated;
