-- afiliacoes_afiliado_insert: a 0015 tinha dois ramos (por produto e por loja).
-- A 0023 e a 0026 recriaram a policy só com o ramo de produto; com produto_id
-- null (afiliação por loja, vendas ou logística) as subqueries viram NULL e o
-- insert é sempre negado. Sintoma em prod: /afiliado/solicitar → "Algo deu
-- errado" ao pedir afiliação a uma loja. Esta versão = 0015 + permite_afiliacao
-- da 0026 no ramo de produto.
drop policy if exists afiliacoes_afiliado_insert on public.afiliacoes;
create policy afiliacoes_afiliado_insert on public.afiliacoes for insert
  with check (
    afiliado_id = auth.uid()
    and status = 'Pendente'
    and (
      (
        produto_id is not null
        and tipo = 'vendas'
        and loja_id = (select p.loja_id from public.produtos p where p.id = produto_id)
        and porcentagem = (
          select coalesce(p.porcentagem_afiliado, 5)
          from public.produtos p
          where p.id = produto_id
        )
        and (select p.permite_afiliacao from public.produtos p where p.id = produto_id) = true
      )
      or (produto_id is null and loja_id is not null and porcentagem = 5)
    )
  );
