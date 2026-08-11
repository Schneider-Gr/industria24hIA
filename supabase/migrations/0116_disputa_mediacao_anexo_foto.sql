-- 0116: anexo de foto nas mensagens do canal de mediação
-- (`disputa_mensagens_mediacao`, 0115) — feedback do dono do produto
-- durante teste ao vivo em produção (10/08/2026): "a mensagem precisa
-- inserir foto para arbitragem"; foto e mensagem persistem no banco e
-- storage, visíveis para quem participa daquele canal (admin sempre; o
-- lado comprador só no canal 'comprador', o lado loja só no canal 'loja'
-- — mesmo isolamento por lado já garantido em 0115 para o texto).
--
-- Reaproveita o bucket privado `disputas` (já existe, 0104) com um prefixo
-- de path novo (`mediacao/{disputa_id}/{destinatario}/...`) em vez de criar
-- bucket separado — mesmo padrão de storage privado + URL assinada sob
-- demanda já usado para as fotos de abertura de disputa.

alter table public.disputa_mensagens_mediacao
  add column if not exists foto_url text;

-- Cast seguro texto->uuid (retorna null em vez de estourar exceção). As
-- policies do bucket 'disputas' (0104) faziam cast direto do 1º segmento
-- do path para uuid, assumindo que TODO objeto do bucket começa com um
-- disputa_id — o novo prefixo `mediacao/...` quebra essa suposição e
-- derruba a query inteira (múltiplas policies permissivas são avaliadas
-- juntas; um erro em qualquer uma propaga). Substitui o cast direto pelo
-- seguro nas policies antigas e usa o mesmo aqui.
create or replace function public.uuid_ou_null(p_texto text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p_texto::uuid;
exception when others then
  return null;
end;
$$;

drop policy if exists disputas_bucket_upload_participante on storage.objects;
create policy disputas_bucket_upload_participante on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'disputas'
    and (storage.foldername(name))[1] <> 'mediacao'
    and public.eh_participante_disputa(public.uuid_ou_null(((storage.foldername(name))[1])))
  );

drop policy if exists disputas_bucket_read_participante on storage.objects;
create policy disputas_bucket_read_participante on storage.objects
  for select to authenticated
  using (
    bucket_id = 'disputas'
    and (storage.foldername(name))[1] <> 'mediacao'
    and (
      public.eh_participante_disputa(public.uuid_ou_null(((storage.foldername(name))[1])))
      or public.is_admin()
    )
  );

-- Participante do canal de mediação: comprador só no canal 'comprador' da
-- própria disputa; loja só no canal 'loja' da própria loja; admin em
-- qualquer canal. Espelha exatamente as policies de
-- disputa_mensagens_mediacao (0115), reaproveitada aqui para o storage.
create or replace function public.eh_participante_mediacao_disputa(p_disputa_id uuid, p_destinatario text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or (
      p_destinatario = 'comprador'
      and exists (select 1 from public.disputas d where d.id = p_disputa_id and d.comprador_id = auth.uid())
    )
    or (
      p_destinatario = 'loja'
      and exists (
        select 1 from public.disputas d
        join public.lojas l on l.id = d.loja_id
        where d.id = p_disputa_id and l.owner_id = auth.uid()
      )
    );
$$;

-- Path esperado: mediacao/{disputa_id}/{destinatario}/{arquivo}
-- storage.foldername(name) = ARRAY['mediacao', disputa_id, destinatario]
create policy disputas_bucket_mediacao_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'disputas'
    and (storage.foldername(name))[1] = 'mediacao'
    and public.eh_participante_mediacao_disputa(
      public.uuid_ou_null((storage.foldername(name))[2]),
      (storage.foldername(name))[3]
    )
  );

create policy disputas_bucket_mediacao_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'disputas'
    and (storage.foldername(name))[1] = 'mediacao'
    and public.eh_participante_mediacao_disputa(
      public.uuid_ou_null((storage.foldername(name))[2]),
      (storage.foldername(name))[3]
    )
  );
