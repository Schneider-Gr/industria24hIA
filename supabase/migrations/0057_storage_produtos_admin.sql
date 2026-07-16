-- 0055: admin também gerencia a galeria de qualquer produto (0051 só
-- liberava o dono da loja). RLS permite múltiplas policies permissivas por
-- comando (OR entre elas), então isto só soma acesso, não substitui 0051.

create policy produtos_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'produtos' and public.is_admin());

create policy produtos_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'produtos' and public.is_admin());
