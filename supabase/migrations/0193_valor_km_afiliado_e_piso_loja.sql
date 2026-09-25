-- 0193: entrega por km do afiliado logístico (PRD 053, US01 e US05).
--
-- produtos.valor_km_afiliado: R$ por km que o consumidor paga pela entrega do
--   afiliado. NULL = seller ainda não definiu (o botão avião aparece apagado,
--   mesmo com permite_logistica_afiliado = true herdado do default da 0079).
-- lojas.piso_km_afiliado: mínimo por km da loja, padrão R$ 6,00 (dona, 24/09).
--
-- O seller tem update na própria loja (policy lojas_owner_all) e no produto;
-- sem trigger ele baixaria o piso ou gravaria abaixo dele direto pela API.
-- Função própria em vez de mexer em guard_campos_restritos, que já foi
-- recriada várias vezes.

alter table public.lojas
  add column if not exists piso_km_afiliado numeric(12,2) not null default 6.00
    check (piso_km_afiliado > 0);

alter table public.produtos
  add column if not exists valor_km_afiliado numeric(12,2)
    check (valor_km_afiliado > 0);

create or replace function public.guard_km_afiliado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_piso numeric(12,2);
begin
  if tg_table_name = 'lojas' then
    if auth.uid() is not null and not public.is_admin() and (
         (tg_op = 'INSERT' and new.piso_km_afiliado is distinct from 6.00)
      or (tg_op = 'UPDATE' and new.piso_km_afiliado is distinct from old.piso_km_afiliado)
    ) then
      raise exception 'Apenas admin altera o piso por km da loja.';
    end if;
    return new;
  end if;

  -- produtos: vale para todos, inclusive admin. Mudar o piso depois não
  -- invalida valores já gravados (PRD 053, US05); eles só saem do checkout.
  if new.valor_km_afiliado is not null
     and (tg_op = 'INSERT' or new.valor_km_afiliado is distinct from old.valor_km_afiliado) then
    select piso_km_afiliado into v_piso from lojas where id = new.loja_id;
    if new.valor_km_afiliado < coalesce(v_piso, 6.00) then
      raise exception 'Valor por km abaixo do piso da loja (R$ %).', replace(to_char(coalesce(v_piso, 6.00), 'FM999990.00'), '.', ',');
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_km_afiliado() from public, anon, authenticated;

drop trigger if exists guard_km_afiliado_lojas on public.lojas;
create trigger guard_km_afiliado_lojas
  before insert or update of piso_km_afiliado on public.lojas
  for each row execute function public.guard_km_afiliado();

drop trigger if exists guard_km_afiliado_produtos on public.produtos;
create trigger guard_km_afiliado_produtos
  before insert or update of valor_km_afiliado on public.produtos
  for each row execute function public.guard_km_afiliado();
