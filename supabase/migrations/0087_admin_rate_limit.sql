-- Rate limit em ações admin sensíveis a abuso em massa (ban de usuário,
-- estorno de pedido — as duas citadas no escopo). Postgres puro, sem
-- dependência nova: volume de ações admin é baixo o bastante pra não
-- precisar de Redis/Upstash.

create table if not exists public.admin_rate_limit (
  admin_id  uuid not null references auth.users(id),
  acao      text not null,
  janela    timestamptz not null,
  contagem  int not null default 1,
  primary key (admin_id, acao, janela)
);

alter table public.admin_rate_limit enable row level security;
-- Sem policy — escrita só via função security definer abaixo (bypassa RLS).

create or replace function public.checar_rate_limit(p_acao text, p_limite int, p_janela_min int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_janela timestamptz := date_trunc('minute', now())
    - (extract(minute from now())::int % p_janela_min) * interval '1 minute';
  v_contagem int;
begin
  insert into public.admin_rate_limit (admin_id, acao, janela, contagem)
  values (auth.uid(), p_acao, v_janela, 1)
  on conflict (admin_id, acao, janela) do update set contagem = admin_rate_limit.contagem + 1
  returning contagem into v_contagem;
  return v_contagem <= p_limite;
end;
$$;

revoke all on function public.checar_rate_limit(text, int, int) from public, anon;
grant execute on function public.checar_rate_limit(text, int, int) to authenticated;

-- Plugado nas duas RPCs sensíveis já existentes (0084 estorno, ambas
-- via banirUsuario que chama o GoTrue direto — essa é checada em código,
-- ver Fase 6 do plano). Estorno de pedido: 20 por 5min.
create or replace function public.admin_estornar_pedido(p_pedido_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas admin.';
  end if;
  if not public.checar_rate_limit('pedido.estornado', 20, 5) then
    raise exception 'Limite de estornos excedido — tente novamente em alguns minutos.';
  end if;
  if p_motivo is null or trim(p_motivo) = '' then
    raise exception 'Motivo é obrigatório.';
  end if;

  update public.pedidos set status_pedido = 'Cancelado' where id = p_pedido_id;
  update public.linha_itens set pago = false
    where pedido_id = p_pedido_id and transferido = false;
  update public.repasses set status = 'estornado'
    where pedido_id = p_pedido_id and status = 'pendente';

  insert into public.auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (auth.uid(), 'admin', 'pedido.estornado', 'pedidos', p_pedido_id,
          jsonb_build_object('motivo', p_motivo));
end;
$$;
