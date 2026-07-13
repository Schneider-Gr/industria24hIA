-- 0041: bucket público de comprovantes de entrega (foto/assinatura das
-- corridas). Upload restrito ao parceiro da corrida; leitura pública (a URL
-- só circula entre as partes e o comprovante não tem PII além da assinatura).

insert into storage.buckets (id, name, public)
values ('entregas', 'entregas', true)
on conflict (id) do nothing;

create policy entregas_upload_parceiro on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'entregas'
    and exists (
      select 1 from public.parceiros_logisticos p
      where p.user_id = auth.uid() and p.status = 'Aprovado'
    )
  );

create policy entregas_read_public on storage.objects
  for select using (bucket_id = 'entregas');
