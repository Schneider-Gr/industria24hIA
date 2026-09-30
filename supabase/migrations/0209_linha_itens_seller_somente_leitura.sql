-- 0209: seller só LÊ os itens dos pedidos da própria loja.
--
-- A policy linha_itens_owner_all (FOR ALL) deixava o dono da loja inserir
-- item em pedido da loja com `valor` arbitrário: a guarda (guard_campos_restritos)
-- barra `valor` só no UPDATE, e o repasse do seller deriva de linha_itens.valor.
-- Quem escreve em linha_itens é o checkout, a coletiva e o cancelamento (todas
-- security definer), o admin e o service role; o app do seller não insere,
-- altera nem apaga item (conferido no código e em pg_proc em 29/09/2026).

drop policy if exists linha_itens_owner_all on public.linha_itens;
drop policy if exists linha_itens_owner_select on public.linha_itens;

create policy linha_itens_owner_select on public.linha_itens
  for select
  using (exists (
    select 1
    from public.pedidos pe
    join public.lojas l on l.id = pe.loja_id
    where pe.id = linha_itens.pedido_id and l.owner_id = auth.uid()
  ));
