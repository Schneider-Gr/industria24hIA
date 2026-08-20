-- E2E de RLS de incidentes_atendimento (spec #311): admin-only, seller/
-- comprador comum não veem nem escrevem. begin/rollback, sem tocar dado real.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000002a', 'e2e-admin-incidente@test.local'),
  ('00000000-0000-4000-8000-00000000002b', 'e2e-comum-incidente@test.local');
insert into public.admins (user_id) values ('00000000-0000-4000-8000-00000000002a');

insert into public.bot_conversas (id, canal) values
  ('00000000-0000-4000-8000-00000000002c', 'site');

create temp table r (nome text, ok boolean, detalhe text);
grant select, insert on r to authenticated;

-- 1) admin cria e lê o incidente -----------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-00000000002a', 'role', 'authenticated')::text, true);
set local role authenticated;

insert into public.incidentes_atendimento (id, conversa_id, resumo)
values ('00000000-0000-4000-8000-00000000002d', '00000000-0000-4000-8000-00000000002c', 'Cliente pediu falar com humano — teste E2E');

insert into r
select 'admin ve o incidente criado', count(*) = 1, count(*)::text
from public.incidentes_atendimento where id = '00000000-0000-4000-8000-00000000002d';

update public.incidentes_atendimento set status = 'resolvido', resolvido_em = now()
where id = '00000000-0000-4000-8000-00000000002d';

insert into r
select 'admin marca resolvido', status = 'resolvido', status
from public.incidentes_atendimento where id = '00000000-0000-4000-8000-00000000002d';

-- 2) usuário comum não vê nem escreve -------------------------------------
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-00000000002b', 'role', 'authenticated')::text, true);

insert into r
select 'usuario comum NAO ve incidentes', count(*) = 0, count(*)::text
from public.incidentes_atendimento;

do $$
declare
  bloqueado boolean := false;
begin
  begin
    insert into public.incidentes_atendimento (conversa_id, resumo)
    values ('00000000-0000-4000-8000-00000000002c', 'tentativa nao-admin');
  exception
    when insufficient_privilege or others then
      bloqueado := true;
  end;
  insert into r values ('usuario comum NAO consegue inserir incidente', bloqueado, '');
end $$;

-- resultado -------------------------------------------------------------
select * from r;
rollback;
