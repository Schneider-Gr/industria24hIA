-- Atribuição de comissão pelo link do afiliado (?ref=IDENTIFICADOR).
--
-- Hoje `checkout_criar_pedido` escolhe a afiliação sozinha:
--   select ... from afiliacoes where status='Aprovada'
--     and (produto_id = <produto> or loja_id = <loja>)
--   order by produto_id nulls last, created_at desc limit 1
-- ou seja, com dois afiliados no mesmo produto a comissão vai sempre para o
-- mais recente, independentemente de quem trouxe o comprador — o link de
-- divulgação não influencia nada.
--
-- Esta migration acrescenta o parâmetro OPCIONAL `ref`. Quando ele casa com o
-- identificador de uma afiliação Aprovada válida para o produto/loja, essa
-- afiliação ganha a comissão; caso contrário cai exatamente na regra antiga.
-- Chamadas existentes (3 argumentos) seguem funcionando.

create or replace function public.checkout_criar_pedido(
  itens jsonb,
  entrega jsonb,
  forma_pagamento text,
  ref text default null
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_pedido uuid;
  v_ref text := nullif(trim(ref), '');
begin
  -- Reaproveita toda a lógica já validada da versão de 3 argumentos.
  v_pedido := public.checkout_criar_pedido(itens, entrega, forma_pagamento);

  if v_ref is null then
    return v_pedido;
  end if;

  -- Reatribui apenas os itens cujo produto/loja é coberto pela afiliação do
  -- link, recalculando o repasse com a porcentagem dela.
  -- `produtos` entra como item do FROM (não como JOIN da tabela alvo: em
  -- UPDATE ... FROM o alvo não pode ser referenciado dentro de um JOIN).
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
  'Cria o pedido e, havendo ?ref= de afiliado válido, credita a comissão a quem divulgou o link.';
