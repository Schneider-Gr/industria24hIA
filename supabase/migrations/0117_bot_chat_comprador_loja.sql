-- 0117: bot de atendimento responde primeiro no chat comprador↔loja
-- (`conversas`/`mensagens`, PR #88), até a loja assumir pessoalmente ou o
-- próprio bot decidir escalar (ver src/lib/ai/botConversa.ts). Pedido do
-- dono do produto: "o bot assistente de atendimento entre na conversa, até
-- que peça ajuda humana".
--
-- Precisa de um autor_id válido para as mensagens do bot (mensagens.autor_id
-- referencia auth.users, NOT NULL) — cria um usuário de sistema fixo em vez
-- de afrouxar a constraint. Sem senha utilizável (ninguém loga como esse
-- usuário; ele só existe como FK-alvo das mensagens do bot).

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values (
  '00000000-0000-4000-8000-0000000000b0',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'bot-atendimento@industria24.com.br',
  crypt(gen_random_uuid()::text, gen_salt('bf')), -- senha aleatória descartada, ninguém loga com ela
  now(),
  now(),
  now(),
  '{"provider":"system","providers":["system"]}',
  '{}'
)
on conflict (id) do nothing;

alter table public.conversas
  add column if not exists bot_ativo boolean not null default true;

comment on column public.conversas.bot_ativo is
  'Bot responde automaticamente às mensagens do comprador enquanto true; a loja respondendo manualmente desativa (ver enviarMensagem, src/app/mensagens/actions.ts).';
