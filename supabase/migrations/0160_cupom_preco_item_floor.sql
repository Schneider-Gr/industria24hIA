-- Arredondamento do preço unitário com cupom passa de round (half up) para
-- floor: o centavo fracionário fica com o comprador, não com a loja.
-- Ex.: 5% sobre R$ 79,90 = 75,905 -> antes 75,91 (desconto 3,99/un), agora
-- 75,90 (desconto 4,00/un). O preço continua com 2 casas porque substitui
-- linha_itens.valor, que é numeric(12,2).
--
-- Só muda esta linha da função criada em 0157; o resto do corpo é idêntico.
-- Espelhada em src/lib/cupom-desconto.ts::precoUnitarioComCupomLoja.

create or replace function public.cupom_preco_item(
  p_regras       jsonb,
  p_produto_id   uuid,
  p_categoria_id uuid,
  p_loja_id      uuid,
  p_preco_base   numeric,
  p_preco_faixa  numeric
) returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare
  v_regra jsonb;
  v_alvo  text;
  v_preco_cupom numeric;
begin
  for v_alvo in select unnest(array['produto', 'categoria', 'loja', 'tudo']) loop
    select r into v_regra
    from jsonb_array_elements(p_regras) r
    where r->>'alvo' = v_alvo
      and (
        (v_alvo = 'produto'   and (r->>'alvo_id')::uuid = p_produto_id) or
        (v_alvo = 'categoria' and p_categoria_id is not null and (r->>'alvo_id')::uuid = p_categoria_id) or
        (v_alvo = 'loja'      and (r->>'alvo_id')::uuid = p_loja_id) or
        (v_alvo = 'tudo')
      )
    limit 1;
    exit when v_regra is not null;
  end loop;

  if v_regra is null then
    return p_preco_faixa;
  end if;

  if v_regra->>'tipo' = 'percentual' then
    v_preco_cupom := p_preco_base * (1 - (v_regra->>'valor')::numeric / 100);
  else
    v_preco_cupom := p_preco_base - (v_regra->>'valor')::numeric;
  end if;
  v_preco_cupom := floor(greatest(0, v_preco_cupom) * 100) / 100;

  return least(p_preco_faixa, v_preco_cupom);
end;
$$;
