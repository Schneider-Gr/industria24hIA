-- 0211: preço da reserva nunca acima do preço à vista do produto.
--
-- A tela do seller já dizia "Pré-venda: de 5% a 15% abaixo do preço à vista,
-- nunca acima", mas nada impedia. Em 01/10/2026 havia 4 lotes acima — o pior,
-- tijolo a R$ 790 com à vista de R$ 5,10, na home. Os 4 foram zerados para
-- `valor = null` (checkout usa o preço do produto). A trava fica no banco para
-- cobrir o formulário e qualquer outro caminho de escrita.
-- ponytail: não revalida lotes quando o seller baixa `produtos.valor` depois;
-- se isso aparecer, espelhar a checagem num trigger em produtos.

create or replace function public.vendas_futuras_preco_teto()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_a_vista numeric;
begin
  if new.valor is null then
    return new;
  end if;
  select valor into v_a_vista from public.produtos where id = new.produto_id;
  if v_a_vista is not null and new.valor > v_a_vista then
    raise exception 'O preço da reserva (R$ %) não pode ser maior que o preço à vista do produto (R$ %).',
      replace(to_char(new.valor, 'FM999999990.00'), '.', ','), replace(to_char(v_a_vista, 'FM999999990.00'), '.', ',');
  end if;
  return new;
end;
$$;

drop trigger if exists vendas_futuras_preco_teto on public.vendas_futuras;
create trigger vendas_futuras_preco_teto
  before insert or update of valor, produto_id on public.vendas_futuras
  for each row execute function public.vendas_futuras_preco_teto();
