-- 0013: afiliado não lê endereço de entrega do comprador (bug hunt 07/07, MED 9).
-- A policy linha_itens_afiliado_read dava a LINHA INTEIRA (incl. entrega_cep,
-- entrega_rua etc. da 0005) para o afiliado via API. Troca por view com apenas
-- as colunas de ganho. A view roda como owner (bypassa RLS) e filtra por
-- auth.uid() na própria definição.

drop policy if exists linha_itens_afiliado_read on public.linha_itens;

create or replace view public.afiliado_ganhos as
  select id, pedido_id, produto_id, produto_nome, quantidade, valor,
         repasse_afiliado, pago, afiliado_id
  from public.linha_itens
  where afiliado_id = auth.uid();

grant select on public.afiliado_ganhos to authenticated;
