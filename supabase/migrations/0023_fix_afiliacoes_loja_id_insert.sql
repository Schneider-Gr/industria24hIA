-- afiliacoes_afiliado_insert (0012) validava produto_id e a porcentagem
-- herdada do produto, mas não validava loja_id: o afiliado podia enviar
-- loja_id de QUALQUER loja junto com produto_id. Se o seller aprovasse
-- achando que era afiliação de 1 produto, comissionaria a loja errada.
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
  );
