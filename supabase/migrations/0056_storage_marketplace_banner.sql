-- 0054: bucket de banner global da home (Editar Marketplace). Mesmo padrão
-- de 0051 (produtos/lojas), mas sem prefixo de dono: é uma config singleton
-- (marketplace_config id=1), então só admin escreve.

insert into storage.buckets (id, name, public)
values ('marketplace', 'marketplace', true)
on conflict (id) do nothing;

create policy marketplace_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'marketplace' and public.is_admin());

create policy marketplace_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'marketplace' and public.is_admin());

create policy marketplace_read_public on storage.objects
  for select using (bucket_id = 'marketplace');
