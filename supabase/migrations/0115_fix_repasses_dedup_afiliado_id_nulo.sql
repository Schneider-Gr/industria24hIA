-- 0115: repasses.unique(pedido_id, destino, afiliado_id) não deduplica
-- linhas de destino='seller', porque afiliado_id é NULL nessas linhas e o
-- Postgres trata NULL como distinto de NULL em unique constraint — o
-- ON CONFLICT em repasses_recalcular_pedido (0111) nunca dá match para
-- seller, então toda vez que a função roda para o mesmo pedido (acontece
-- tanto em pedido_confirmar_entrega quanto de novo em
-- dispararRepasseAutomaticoComCliente, ver src/lib/repasses.ts) insere uma
-- linha nova em vez de atualizar a existente. Se rodar 2x para o mesmo
-- pedido, dispararRepasseAutomaticoComCliente lê "pendentes" e transfere
-- PIX duas vezes — bug de dinheiro, não só de ledger sujo.
--
-- Fix: troca o unique constraint por dois índices únicos parciais — um para
-- destino='seller' (afiliado_id sempre null) por (pedido_id, destino), outro
-- para destino='afiliado' por (pedido_id, destino, afiliado_id) como antes.
-- ON CONFLICT precisa apontar pro índice certo em cada INSERT.

alter table public.repasses drop constraint if exists repasses_pedido_id_destino_afiliado_id_key;

-- Dedup das duplicatas já geradas pelo bug antes de poder criar o índice
-- único (achado em produção nesta migration: 1 pedido, 3 linhas 'seller',
-- todas status='falhou', nenhuma transferida — nenhum PIX saiu em duplicata
-- neste caso). Regra: se alguma linha do grupo já foi 'transferido', mantém
-- essa (dinheiro já saiu, é a fonte de verdade) e apaga as demais; senão
-- mantém a mais recente. Nunca soma valores de duplicatas automaticamente.
delete from public.repasses r
using (
  select id, pedido_id,
    row_number() over (
      partition by pedido_id
      order by (status = 'transferido') desc, criado_em desc
    ) as rn
  from public.repasses
  where destino = 'seller'
) dup
where r.id = dup.id and dup.rn > 1;

create unique index if not exists repasses_seller_uniq
  on public.repasses (pedido_id, destino)
  where afiliado_id is null;

create unique index if not exists repasses_afiliado_uniq
  on public.repasses (pedido_id, destino, afiliado_id)
  where afiliado_id is not null;

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
  on conflict (pedido_id, destino, afiliado_id) where afiliado_id is not null
  do update set valor = excluded.valor
  where public.repasses.status = 'pendente';
end;
$$;

revoke all on function public.repasses_recalcular_pedido(uuid) from public, anon, authenticated;

-- calcular_repasses_pedido (0084/0111, usada pelo admin) já é wrapper fino
-- sobre repasses_recalcular_pedido — nenhuma mudança necessária nela.
