-- 0117: confirma que a migration cria o usuário de sistema do bot e a
-- coluna bot_ativo sem quebrar nada. begin/rollback, não altera nada de
-- verdade.
begin;

-- (corpo da migration 0117 é aplicado antes deste arquivo pelo script de
-- teste — ver README de convenção em supabase/tests/)

select id, email from auth.users where id = '00000000-0000-4000-8000-0000000000b0';
select column_name, is_nullable, column_default from information_schema.columns
where table_schema='public' and table_name='conversas' and column_name='bot_ativo';

-- Confirma que uma conversa nova nasce com bot_ativo = true (default).
insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000c001', 'e2e-bot-comprador@test.local');
insert into public.lojas (id, owner_id, nome, cep, rua, numero, cidade, estado)
values ('00000000-0000-4000-8000-00000000c00a', '00000000-0000-4000-8000-00000000c001', 'Loja E2E Bot', '69000000', 'Rua A', '1', 'Manaus', 'AM');
insert into public.conversas (id, comprador_id, loja_id)
values ('00000000-0000-4000-8000-00000000c00d', '00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-00000000c00a');

select 'conversa nova nasce com bot_ativo=true' as teste, bot_ativo as ok
from public.conversas where id = '00000000-0000-4000-8000-00000000c00d';

rollback;
