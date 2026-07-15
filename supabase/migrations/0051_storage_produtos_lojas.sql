-- 0051: buckets públicos para upload de imagem de produto e de
-- banner/logotipo da loja (só existia leitura de produto_imagens/lojas.*_url
-- vindo de URL externa, sem upload real no seller). Path convention:
-- <loja_id>/<arquivo> — a policy de escrita valida que o loja_id do path
-- pertence ao seller autenticado, mesmo padrão de 0041 (entregas).

insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true), ('lojas', 'lojas', true)
on conflict (id) do nothing;

create policy produtos_upload_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'produtos'
    and exists (
      select 1 from public.lojas l
      where l.owner_id = auth.uid()
        and l.id::text = (storage.foldername(name))[1]
    )
  );

create policy produtos_delete_owner on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'produtos'
    and exists (
      select 1 from public.lojas l
      where l.owner_id = auth.uid()
        and l.id::text = (storage.foldername(name))[1]
    )
  );

create policy produtos_read_public on storage.objects
  for select using (bucket_id = 'produtos');

create policy lojas_upload_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lojas'
    and exists (
      select 1 from public.lojas l
      where l.owner_id = auth.uid()
        and l.id::text = (storage.foldername(name))[1]
    )
  );

create policy lojas_delete_owner on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lojas'
    and exists (
      select 1 from public.lojas l
      where l.owner_id = auth.uid()
        and l.id::text = (storage.foldername(name))[1]
    )
  );

create policy lojas_read_public on storage.objects
  for select using (bucket_id = 'lojas');
