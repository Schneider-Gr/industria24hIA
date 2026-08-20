-- 0127: bloqueia auto-afiliação (Issue #298)
--
-- As policies afiliacoes_loja_owner_all / afiliacoes_owner_all (for all, sem
-- restrição de status) deixam o dono da loja/produto inserir uma linha em
-- afiliacoes com afiliado_id = ele mesmo e status = 'Aprovada' direto —
-- sem passar pelo guard de status='Pendente' que existe só para a policy
-- afiliacoes_afiliado_insert (afiliado externo).
--
-- 0119 já limitou o REPASSE a vendas com ?ref= válido; este guard fecha o
-- CADASTRO em si, que ainda polui relatórios/dashboards de afiliados e é
-- vetor reaberto se algum fluxo futuro passar ref automaticamente.
--
-- guard_afiliacoes_reatribuicao (0021) só age em UPDATE — não cobre INSERT.

create or replace function public.guard_afiliacoes_auto_afiliacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dono_produto uuid;
  v_dono_loja uuid;
begin
  if public.is_admin() then
    return new;
  end if;

  select l.owner_id into v_dono_produto
  from produtos p join lojas l on l.id = p.loja_id
  where p.id = new.produto_id;

  select l.owner_id into v_dono_loja
  from lojas l
  where l.id = new.loja_id;

  if new.afiliado_id = v_dono_produto or new.afiliado_id = v_dono_loja then
    raise exception 'O dono da loja/produto não pode se afiliar a si mesmo.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_afiliacoes_auto_afiliacao on public.afiliacoes;
create trigger guard_afiliacoes_auto_afiliacao
  before insert on public.afiliacoes
  for each row execute function public.guard_afiliacoes_auto_afiliacao();
