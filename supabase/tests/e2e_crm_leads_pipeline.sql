-- E2E do CRM de leads (issue #141): RLS admin/seller, dedupe por contato,
-- opt-in de WhatsApp gated por admin. begin/rollback, sem tocar dado real.
begin;

-- seeds ----------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000001a', 'e2e-admin-crm@test.local'),
  ('00000000-0000-4000-8000-00000000001b', 'e2e-seller-crm@test.local'),
  ('00000000-0000-4000-8000-00000000001c', 'e2e-seller-outro-crm@test.local');
insert into public.admins (user_id) values ('00000000-0000-4000-8000-00000000001a');

insert into public.lojas (id, owner_id, nome, cep, rua, numero, cidade, estado)
values ('00000000-0000-4000-8000-0000000000ba', '00000000-0000-4000-8000-00000000001b',
        'Loja CRM E2E', '69000000', 'Rua A', '1', 'Manaus', 'AM');

-- lead vinculado à loja do seller B, lead sem loja (só bot geral)
insert into public.leads (id, nome, contato, status, fonte, loja_id)
values
  ('00000000-0000-4000-8000-0000000000c1', 'Lead da loja', '5592988887777', 'novo', 'bot_site', '00000000-0000-4000-8000-0000000000ba'),
  ('00000000-0000-4000-8000-0000000000c2', 'Lead sem loja', 'lead-sem-loja@test.local', 'novo', 'manual', null);

create temp table r (nome text, ok boolean, detalhe text);
grant select, insert on r to authenticated;

-- 1) seller dono da loja vê o lead da própria loja ----------------------
-- `postgres`/service role tem BYPASSRLS: sem `set role authenticated` a
-- RLS não é sequer avaliada e todo mundo vê tudo (isso já pegou 2 falsos-
-- positivos ao escrever este teste).
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-00000000001b', 'role', 'authenticated')::text, true);
set local role authenticated;

insert into r
select 'seller dono da loja ve o lead vinculado', count(*) = 1, count(*)::text
from public.leads where id = '00000000-0000-4000-8000-0000000000c1';

insert into r
select 'seller dono da loja NAO ve lead sem loja', count(*) = 0, count(*)::text
from public.leads where id = '00000000-0000-4000-8000-0000000000c2';

-- 2) outro seller nao ve o lead da loja alheia ---------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-00000000001c', 'role', 'authenticated')::text, true);

insert into r
select 'seller de outra loja NAO ve o lead', count(*) = 0, count(*)::text
from public.leads where id = '00000000-0000-4000-8000-0000000000c1';

-- 3) admin ve os dois -----------------------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-00000000001a', 'role', 'authenticated')::text, true);

insert into r
select 'admin ve os dois leads', count(*) = 2, count(*)::text
from public.leads where id in ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c2');

-- 4) dedupe: mesmo telefone (com pontuação diferente) e mesmo e-mail -----
insert into r
select 'dedupe por telefone (dígitos iguais)', public.buscar_lead_duplicado('55 (92) 98888-7777') = '00000000-0000-4000-8000-0000000000c1', '';

insert into r
select 'dedupe por e-mail (case-insensitive)', public.buscar_lead_duplicado('LEAD-SEM-LOJA@test.local') = '00000000-0000-4000-8000-0000000000c2', '';

insert into r
select 'dedupe nao acha contato novo', public.buscar_lead_duplicado('contato-inedito@test.local') is null, '';

-- 5) opt-in de WhatsApp: só admin registra --------------------------------
select public.registrar_optin_whatsapp('00000000-0000-4000-8000-0000000000c1', 'Aceito receber novidades no WhatsApp.');

insert into r
select 'admin registra opt-in', whatsapp_optin_at is not null, coalesce(whatsapp_optin_texto, '')
from public.leads where id = '00000000-0000-4000-8000-0000000000c1';

-- seller (não-admin) tentando registrar opt-in: função é security definer
-- gated por is_admin() internamente — update não afeta nenhuma linha.
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-00000000001b', 'role', 'authenticated')::text, true);

select public.registrar_optin_whatsapp('00000000-0000-4000-8000-0000000000c2', 'tentativa nao-admin');

-- volta pro admin só pra conseguir LER o lead (RLS de seller nem deixaria
-- ver esse lead sem loja) e confirmar que o update acima não teve efeito.
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-00000000001a', 'role', 'authenticated')::text, true);

insert into r
select 'seller NAO consegue registrar opt-in de outro lead', whatsapp_optin_at is null, ''
from public.leads where id = '00000000-0000-4000-8000-0000000000c2';

-- resultado -------------------------------------------------------------
select * from r;
rollback;
