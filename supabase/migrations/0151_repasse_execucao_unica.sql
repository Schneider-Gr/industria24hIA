-- 0151: fecha os dois furos de repasse pago em dobro (achados T1 e T2 da
-- auditoria do caminho do dinheiro, 27/08 — spec change
-- confiabilidade-caminho-dinheiro-pos-checkout).
--
-- T1: `unique (pedido_id, destino, afiliado_id)` (0084) NÃO restringe linha
-- de seller, porque `afiliado_id` é NULL e NULLs são distintos num índice
-- unique no Postgres. O `on conflict` do bloco de seller em
-- repasses_recalcular_pedido (0111) nunca dispara, então uma 2ª execução da
-- confirmação de entrega (webhook + verificação manual, ou endpoint público
-- do entregador chamado de novo) insere uma 2ª linha `pendente` de seller, e
-- dispararRepasseAutomaticoComCliente transfere PIX de novo.
--   Fix: índice parcial unique (pedido_id, destino) where afiliado_id is null,
--   e o bloco de seller passa a mirar esse índice no on conflict.
--
-- T2: repasses.ts chama createPixTransfer com a linha ainda `pendente` e só
-- grava `transferido` depois. Novo status `processando` para o claim atômico
-- que a app passa a fazer antes da transferência (ver src/lib/repasses.ts).

-- ---- T2: status processando ----
alter table public.repasses drop constraint if exists repasses_status_check;
alter table public.repasses
  add constraint repasses_status_check
  check (status in ('pendente', 'processando', 'transferido', 'falhou', 'inelegivel', 'estornado'));

-- ---- T1: unicidade da linha de seller por pedido ----
-- Pré-condição: se já existir dado duplicado em prod (2+ linhas seller no
-- mesmo pedido), o create index falha. Consolidar antes: manter a de menor
-- id, somar valores só se ambas `pendente`. Bloco defensivo:
do $$
declare
  v_dup record;
begin
  for v_dup in
    select pedido_id
    from public.repasses
    where destino = 'seller'
    group by pedido_id
    having count(*) > 1
  loop
    raise warning 'repasses: pedido % tem % linhas de seller — consolidar manualmente antes de aplicar',
      v_dup.pedido_id,
      (select count(*) from public.repasses where destino = 'seller' and pedido_id = v_dup.pedido_id);
  end loop;
  if found then
    raise exception 'Há linhas de repasse seller duplicadas. Consolide em /admin/repasses e reaplique.';
  end if;
end;
$$;

create unique index if not exists repasses_seller_por_pedido_ux
  on public.repasses (pedido_id, destino)
  where afiliado_id is null;

-- ---- repasses_recalcular_pedido: bloco de seller mira o índice parcial ----
create or replace function public.repasses_recalcular_pedido(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loja_id uuid;
begin
  select loja_id into v_loja_id from public.pedidos where id = p_pedido_id;
  if v_loja_id is null then
    raise exception 'Pedido não encontrado.';
  end if;

  insert into public.repasses (pedido_id, destino, loja_id, valor)
  select p_pedido_id, 'seller', v_loja_id, coalesce(sum(li.repasse_vendedor), 0)
  from public.linha_itens li
  where li.pedido_id = p_pedido_id
  having coalesce(sum(li.repasse_vendedor), 0) > 0
  on conflict (pedido_id, destino) where afiliado_id is null
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

revoke all on function public.repasses_recalcular_pedido(uuid) from public, anon, authenticated;
