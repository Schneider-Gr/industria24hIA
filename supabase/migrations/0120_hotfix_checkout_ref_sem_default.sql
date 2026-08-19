-- HOTFIX de produção 13/08/2026: a 0119 recriou a versão de 4 argumentos com
-- `ref text default null`, e o default tornou AMBÍGUA a chamada interna de 3
-- argumentos (`checkout_criar_pedido(itens, entrega, forma_pagamento)`), que
-- passou a casar tanto com a de 3 quanto com a de 4-com-default:
--   ERROR 42725: function public.checkout_criar_pedido(jsonb, jsonb, text) is not unique
-- Efeito: TODO checkout falhava, porque o caminho real é 6 → 5 → 4 → 3.
--
-- Correção: a de 4 argumentos passa a exigir `ref` explicitamente (sem
-- default). Quem chama são as versões de 5/6 argumentos, que sempre passam o
-- valor — nenhuma chamada real dependia do default.

drop function if exists public.checkout_criar_pedido(jsonb, jsonb, text, text);

create function public.checkout_criar_pedido(
  itens jsonb,
  entrega jsonb,
  forma_pagamento text,
  ref text
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_pedido uuid;
  v_ref text := nullif(trim(ref), '');
begin
  v_pedido := public.checkout_criar_pedido(itens, entrega, forma_pagamento);

  -- Descarta a atribuição automática da versão de 3 args: comissão de afiliado
  -- é remuneração por indicação, não bônus por existir uma afiliação na loja.
  update linha_itens
  set afiliado_id = null,
      repasse_afiliado = 0
  where pedido_id = v_pedido;

  if v_ref is null then
    return v_pedido;
  end if;

  update linha_itens li
  set afiliado_id = a.afiliado_id,
      repasse_afiliado = round(li.valor * a.porcentagem / 100, 2)
  from afiliacoes a, produtos p
  where li.pedido_id = v_pedido
    and p.id = li.produto_id
    and a.identificador = v_ref
    and a.status = 'Aprovada'
    and (a.produto_id = li.produto_id or a.loja_id = p.loja_id);

  return v_pedido;
end;
$function$;

comment on function public.checkout_criar_pedido(jsonb, jsonb, text, text) is
  'Cria o pedido e credita comissão APENAS quando há ?ref= de afiliado válido; sem link, repasse_afiliado = 0.';
