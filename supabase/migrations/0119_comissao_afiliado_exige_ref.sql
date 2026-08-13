-- Comissão de afiliado só com link de divulgação (?ref=).
--
-- Achado no QA de produção 13/08/2026: a versão de 3 argumentos escolhe a
-- afiliação sozinha —
--   select ... from afiliacoes where status='Aprovada'
--     and (produto_id = <produto> or loja_id = <loja>)
--   order by produto_id nulls last, created_at desc limit 1
-- — então TODA venda orgânica da loja credita comissão à afiliação Aprovada
-- mais recente, mesmo sem ninguém ter divulgado nada. Efeito real observado:
-- 26 pedidos de "Tijolo cerâmico 6 furos" pagaram 5% a um afiliado que não
-- trouxe nenhum comprador, e que é o próprio dono da loja (auto-afiliação).
--
-- Aqui a de 4 argumentos passa a ser a fonte da verdade: zera a atribuição
-- automática e credita apenas quando o `ref` casa com uma afiliação Aprovada
-- válida para o produto/loja. Sem link = sem comissão.
--
-- A de 3 argumentos fica intacta (chamadas legadas seguem funcionando); o
-- checkout do site chama a de 4.

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
  'Cria o pedido e credita comissão APENAS quando há ?ref= de afiliado válido; sem link, repasse_afiliado = 0.';
