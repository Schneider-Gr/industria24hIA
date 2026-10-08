-- 0216: notificação push e dados ao vivo no app do entregador.
--
-- 1. push_inscricoes: uma linha por navegador/aparelho que aceitou receber
--    notificação. RLS ligada, só leitura do dono; a escrita passa pelas
--    funções abaixo, porque o mesmo endpoint pode trocar de usuário (dois
--    entregadores no mesmo celular) e a linha antiga é de outra pessoa.
--    O envio é feito pelo servidor com service role.
-- 2. corridas entra na publicação do Realtime: a tela do entregador atualiza
--    sozinha quando uma corrida nasce ou muda de status. O Realtime respeita as
--    policies de leitura que já existem (afiliado exclusivo, parceiro, pool).

create table if not exists public.push_inscricoes (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users (id) on delete cascade,
  endpoint  text not null unique check (endpoint ~ '^https://'),
  p256dh    text not null,
  auth      text not null,
  criado_em timestamptz not null default now()
);

create index if not exists push_inscricoes_user_idx on public.push_inscricoes (user_id);

alter table public.push_inscricoes enable row level security;

drop policy if exists push_inscricoes_read on public.push_inscricoes;
create policy push_inscricoes_read on public.push_inscricoes
  for select using (user_id = auth.uid());

comment on table public.push_inscricoes is
  'Inscrições de Web Push por aparelho (0216). Escrita só por push_inscrever/push_desinscrever; envio pelo servidor com service role.';

create or replace function public.push_inscrever(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Faça login para ativar as notificações.';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 2000
     or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = ''
     or length(p_p256dh) > 300 or length(p_auth) > 100 then
    raise exception 'Inscrição de notificação inválida.';
  end if;
  -- ponytail: teto por usuário contra abuso; um entregador tem um ou dois aparelhos.
  if (select count(*) from push_inscricoes where user_id = v_user and endpoint <> p_endpoint) >= 10 then
    raise exception 'Muitos aparelhos inscritos. Desative as notificações em algum deles.';
  end if;

  insert into push_inscricoes (user_id, endpoint, p256dh, auth)
  values (v_user, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, criado_em = now();
end;
$$;

create or replace function public.push_desinscrever(p_endpoint text)
returns void
language sql
security definer
set search_path to 'public'
as $$
  delete from push_inscricoes where endpoint = p_endpoint and user_id = auth.uid();
$$;

revoke all on function public.push_inscrever(text, text, text) from public, anon;
revoke all on function public.push_desinscrever(text) from public, anon;
grant execute on function public.push_inscrever(text, text, text) to authenticated;
grant execute on function public.push_desinscrever(text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'corridas'
  ) then
    alter publication supabase_realtime add table public.corridas;
  end if;
end $$;
