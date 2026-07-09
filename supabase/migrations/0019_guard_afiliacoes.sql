-- 0019: guarda de afiliacoes (bug hunt 08/07, HIGH)
--
-- afiliacoes_owner_all/afiliacoes_loja_owner_all (0002/0012) são `for all`
-- sem trigger — o seller dono da loja podia trocar afiliado_id de uma
-- afiliação já Aprovada para qualquer uuid, desviando repasse_afiliado dos
-- próximos checkouts, e também alterar porcentagem já aprovada sem novo
-- consentimento do afiliado.

create or replace function public.guard_afiliacoes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.afiliado_id is distinct from old.afiliado_id then
    raise exception 'Apenas admin altera o afiliado de uma afiliação existente.';
  end if;

  if new.porcentagem is distinct from old.porcentagem
     and new.status is distinct from 'Pendente' then
    raise exception 'Alterar porcentagem exige voltar o status para Pendente (novo aceite do afiliado).';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_afiliacoes_reatribuicao on public.afiliacoes;
create trigger guard_afiliacoes_reatribuicao
  before update on public.afiliacoes
  for each row execute function public.guard_afiliacoes();
