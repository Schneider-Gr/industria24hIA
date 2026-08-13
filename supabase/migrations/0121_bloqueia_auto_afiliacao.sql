-- Bloqueia auto-afiliação: dono de loja não pode ser afiliado da própria loja.
--
-- Achado no QA de 13/08/2026: `seller-teste-i24` é dono da loja "construção" e
-- afiliado aprovado dela, recebendo 5% sobre as próprias vendas. Comissão de
-- afiliado é remuneração por trazer comprador de fora; o dono não traz
-- comprador para si mesmo, então isso é só vazamento de margem.
--
-- Trigger em vez de CHECK constraint porque a regra depende de outra tabela
-- (`lojas.owner_id`) e, no caso de afiliação por produto, a loja vem do
-- próprio produto — CHECK não faz subquery.
--
-- Cobre os dois formatos de afiliação: por loja (`loja_id` preenchido) e por
-- produto (`produto_id` preenchido, loja derivada do produto).
--
-- Não remove as 6 afiliações de auto-afiliação já existentes: apagá-las é
-- decisão do dono, junto com a do estorno das comissões correspondentes.

create or replace function public.barra_auto_afiliacao()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_owner uuid;
begin
  select l.owner_id into v_owner
  from lojas l
  where l.id = coalesce(
    new.loja_id,
    (select p.loja_id from produtos p where p.id = new.produto_id)
  );

  if v_owner is not null and v_owner = new.afiliado_id then
    raise exception 'Você é o dono desta loja e não pode se afiliar a ela.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_barra_auto_afiliacao on public.afiliacoes;

create trigger trg_barra_auto_afiliacao
  before insert or update of afiliado_id, loja_id, produto_id
  on public.afiliacoes
  for each row
  execute function public.barra_auto_afiliacao();
