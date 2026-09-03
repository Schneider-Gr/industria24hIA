-- Leitura do próprio repasse para seller e afiliado.
--
-- `public.repasses` (0084) nasceu só com `repasses_admin_all` (is_admin).
-- Com o dashboard do seller (#490) exibindo repasses, faltou a policy de
-- leitura por dono — o card teve que usar `linha_itens.repasse_vendedor`
-- em vez do ledger real. Estas policies são estritamente SELECT: nenhuma
-- escrita nova é liberada. O ledger continua sendo populado só pelas
-- funções SECURITY DEFINER (calcular_repasses_pedido,
-- repasses_recalcular_pedido) e pelo admin.
--
-- Caminho do dinheiro: mudança de RLS em `repasses`. Confirmada pelo dono
-- (2026-09-03). Closes #493.

-- Seller: repasses da própria loja.
drop policy if exists repasses_seller_read on public.repasses;
create policy repasses_seller_read on public.repasses
  for select
  using (
    exists (
      select 1 from public.lojas l
      where l.id = public.repasses.loja_id
        and l.owner_id = auth.uid()
    )
  );

-- Afiliado: repasses destinados a ele.
drop policy if exists repasses_afiliado_read on public.repasses;
create policy repasses_afiliado_read on public.repasses
  for select
  using (public.repasses.afiliado_id = auth.uid());
