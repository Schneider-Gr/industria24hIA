-- afiliacoes_afiliado_insert (0023) valida produto_id, porcentagem e loja_id,
-- mas não valida produtos.permite_afiliacao: um afiliado podia solicitar
-- afiliação em produto que o seller desativou para afiliação. Se aprovado
-- por engano, checkout passaria a pagar repasse num produto não-afiliável.
drop policy if exists afiliacoes_afiliado_insert on public.afiliacoes;
create policy afiliacoes_afiliado_insert on public.afiliacoes for insert
  with check (
    afiliado_id = auth.uid()
    and status = 'Pendente'
    and porcentagem = (
      select coalesce(p.porcentagem_afiliado, 5)
      from public.produtos p
      where p.id = produto_id
    )
    and loja_id = (
      select p.loja_id
      from public.produtos p
      where p.id = produto_id
    )
    and (
      select p.permite_afiliacao
      from public.produtos p
      where p.id = produto_id
    ) = true
  );
