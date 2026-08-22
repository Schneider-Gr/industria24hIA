-- 0138: seller lê as `corridas` (despacho automático, 0043) da PRÓPRIA loja.
-- Achado do PRD 008 §7: o seller não tinha painel nenhum para acompanhar a
-- entrega do próprio pedido — `corridas` só tinha policy de leitura para o
-- solicitante (comprador), o parceiro/afiliado, e admin (0039). Mesmo padrão
-- de rotas_seller_read (0042).
create policy corridas_seller_read on public.corridas
  for select using (
    exists (
      select 1 from pedidos pe join lojas l on l.id = pe.loja_id
      where pe.id = corridas.pedido_id and l.owner_id = auth.uid()
    )
  );
