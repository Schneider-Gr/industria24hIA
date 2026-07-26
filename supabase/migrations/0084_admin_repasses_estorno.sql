-- Ledger de repasses (visão pendente/pago por loja/afiliado) + capacidade do
-- admin estornar um pedido e abrir disputa. Hoje /admin/pedidos é 100%
-- leitura — nenhum marketplace sério opera assim. Escopo decidido com o
-- dono do projeto (25/07): estorno é só registro interno (cancela pedido,
-- marca repasse como estornado), sem chamar a API de estorno da Asaas;
-- disputa é campo simples, sem workflow de estados.
--
-- Design da tabela `repasses` portado do PR #43 (feat/repasse-pix-asaas,
-- aberto e desatualizado ~24 migrations, tratado como referência morta —
-- não mesclado, não usado como base de rebase). Esta migration NÃO traz a
-- automação de transferência PIX (afiliados_chave_pix, createPixTransfer)
-- daquele PR — é só o ledger e a leitura, fora do escopo pedido aqui.

create table if not exists public.repasses (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references public.pedidos(id) on delete cascade,
  destino        text not null check (destino in ('seller', 'afiliado')),
  loja_id        uuid references public.lojas(id),
  afiliado_id    uuid references auth.users(id),
  valor          numeric(12, 2) not null,
  status         text not null default 'pendente'
    check (status in ('pendente', 'transferido', 'falhou', 'inelegivel', 'estornado')),
  criado_em      timestamptz not null default now(),
  transferido_em timestamptz,
  unique (pedido_id, destino, afiliado_id)
);

create index if not exists repasses_loja_idx on public.repasses (loja_id, status);
create index if not exists repasses_pedido_idx on public.repasses (pedido_id);

alter table public.repasses enable row level security;

create policy repasses_admin_all on public.repasses for all
  using (public.is_admin()) with check (public.is_admin());

-- Campo de disputa simples (sem tabela dedicada — decisão de escopo 25/07).
alter table public.pedidos add column if not exists disputa_aberta_em timestamptz;

-- Popula/atualiza o ledger de repasses de um pedido a partir de linha_itens
-- (repasse_vendedor já é o líquido ao seller; repasse_afiliado, por afiliado
-- do pedido). Idempotente via upsert on conflict.
create or replace function public.calcular_repasses_pedido(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loja_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Apenas admin.';
  end if;

  select loja_id into v_loja_id from public.pedidos where id = p_pedido_id;
  if v_loja_id is null then
    raise exception 'Pedido não encontrado.';
  end if;

  insert into public.repasses (pedido_id, destino, loja_id, valor)
  select p_pedido_id, 'seller', v_loja_id, coalesce(sum(li.repasse_vendedor), 0)
  from public.linha_itens li
  where li.pedido_id = p_pedido_id
  having coalesce(sum(li.repasse_vendedor), 0) > 0
  on conflict (pedido_id, destino, afiliado_id)
  do update set valor = excluded.valor
  where public.repasses.status = 'pendente';

  insert into public.repasses (pedido_id, destino, loja_id, afiliado_id, valor)
  select p_pedido_id, 'afiliado', v_loja_id, li.afiliado_id, sum(li.repasse_afiliado)
  from public.linha_itens li
  where li.pedido_id = p_pedido_id and li.afiliado_id is not null
  group by li.afiliado_id
  having sum(li.repasse_afiliado) > 0
  on conflict (pedido_id, destino, afiliado_id)
  do update set valor = excluded.valor
  where public.repasses.status = 'pendente';
end;
$$;

-- Estorno interno: cancela o pedido, libera os itens não transferidos e
-- marca repasses pendentes como estornados. NÃO chama a Asaas — reversão
-- financeira real (PIX/cartão) continua manual, fora do sistema.
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

create or replace function public.admin_abrir_disputa(p_pedido_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas admin.';
  end if;
  if p_motivo is null or trim(p_motivo) = '' then
    raise exception 'Motivo é obrigatório.';
  end if;

  update public.pedidos set disputa_aberta_em = now() where id = p_pedido_id;

  insert into public.auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (auth.uid(), 'admin', 'pedido.disputa_aberta', 'pedidos', p_pedido_id,
          jsonb_build_object('motivo', p_motivo));
end;
$$;

revoke all on function public.calcular_repasses_pedido(uuid) from public, anon;
grant execute on function public.calcular_repasses_pedido(uuid) to authenticated;
revoke all on function public.admin_estornar_pedido(uuid, text) from public, anon;
grant execute on function public.admin_estornar_pedido(uuid, text) to authenticated;
revoke all on function public.admin_abrir_disputa(uuid, text) from public, anon;
grant execute on function public.admin_abrir_disputa(uuid, text) to authenticated;
