-- 0158: conserta o valor do repasse ao seller e devolve ao seller o botão de
-- solicitar o repasse depois da entrega confirmada (paridade com o Bubble).
--
-- Problema 1 — repasse do seller nasce zero em pedido novo.
-- repasses_recalcular_pedido (0111) soma linha_itens.repasse_vendedor, coluna
-- que existe desde a 0005 só porque foi importada do Bubble e que nenhuma
-- migration nem o app escrevem (a 0156 já registrava isso em comentário).
-- Em produção: 293/305 itens têm valor, todos de pedidos com bubble_id; os
-- itens de setembro/2026 estão todos NULL. Com o `having sum(...) > 0`, o
-- pedido nascido no Next nem chega a criar a linha de repasse do seller.
--
-- Correção: derivar das colunas que o checkout realmente escreve —
-- valor - repasse_ind - repasse_afiliado — mantendo coalesce com o legado para
-- não reescrever a história dos pedidos migrados. Conferido contra produção em
-- 04/09/2026: das 293 linhas legadas, 276 batem com a derivação; 13 divergem em
-- R$ 0,01 (arredondamento do Bubble) e 4 divergem bem mais (até R$ 13,73)
-- porque o Bubble aplicou uma segunda dedução que nunca foi gravada em
-- repasse_afiliado — ex.: valor 274,50, repasse_ind 13,73, repasse_vendedor
-- 247,04, com os 13,73 descontados duas vezes. Nesses casos o coalesce preserva
-- o valor legado e a derivação não os toca; corrigir a história do Bubble não é
-- escopo desta migration. As 12 linhas com repasse_vendedor NULL são as únicas
-- que passam a usar a derivação.
--
-- Frete NÃO entra: a decisão D-E4.2 ("seller recebe ... + frete") é de
-- 2026-07-16, anterior a transportadora com tabela (0145) e Uber Direct
-- (0139/0140), onde o frete tem destinatário próprio. Incluir frete é uma linha
-- nesta mesma expressão e fica como decisão explícita do dono.
--
-- Cupom: desconto_cupom de cupom de plataforma sai do repasse_ind e não toca no
-- seller; cupom de loja (0157) já reduziu `valor`. A expressão fecha nos dois
-- casos sem termo extra.
--
-- Problema 2 - o seller nao tem como pedir o proprio dinheiro. No Bubble cada
-- item de pedido ganha, na coluna Transferencia, um botao "Solicitar
-- Transferencia". Engenharia reversa do Bubble em 04/09/2026 (pedido
-- MKMNDBAHAA, gravacao de tela): com o pedido ja pago o botao NAO existe - a
-- coluna Transferencia fica vazia e o que aparece e o botao "Entregar". So
-- depois que o lojista digita o codigo do comprador no modal "Entrega Balcao" e
-- a entrega e confirmada ("Entregue: sim - Em 04/09/26, 07:32") o botao
-- "Solicitar Transferencia" surge. O gate do Bubble e a CONFIRMACAO DE ENTREGA,
-- nao o pagamento.
--
-- Consequencia de projeto: a solicitacao do seller nao antecipa dinheiro, ela
-- devolve ao seller o controle sobre um repasse que ja esta elegivel e que hoje
-- depende inteiramente do disparo automatico da 0111 ter dado certo
-- (transferencia que falhou, chave PIX cadastrada depois, pedido do Bubble
-- migrado sem ledger). O gate abaixo e o mesmo de pedido_confirmar_entrega:
-- pedido pago e todo item com entrega confirmada. Os dois gatilhos convergem no
-- mesmo ledger idempotente e o indice parcial unico por (pedido, destino) segue
-- impedindo repasse em dobro.

-- Problema 3 - repasses_recalcular_pedido esta QUEBRADA em producao hoje.
-- A 0111 usa `on conflict (pedido_id, destino, afiliado_id)`, mas em producao
-- nao existe constraint unica com essa assinatura: a 0147_fix_repasses_dedup
-- criou dois indices unicos PARCIAIS no lugar dela -- repasses_seller_uniq
-- (pedido_id, destino) where afiliado_id is null e repasses_afiliado_uniq
-- (pedido_id, destino, afiliado_id) where afiliado_id is not null. Indice
-- parcial so serve de arbitro se o ON CONFLICT repetir o predicado, entao a
-- funcao levanta 42P10 "there is no unique or exclusion constraint matching the
-- ON CONFLICT specification" em TODA execucao, nao so quando ha conflito.
-- Confirmado contra producao em 04/09/2026 executando a RPC dentro de
-- begin/rollback. Como o `perform` esta dentro de pedido_confirmar_entrega, a
-- confirmacao de entrega inteira aborta -- o repasse automatico do seller e do
-- afiliado nao acontece de fato hoje, e essa e a causa raiz de o ledger estar
-- praticamente vazio, nao so a coluna repasse_vendedor NULL do Problema 1.
-- Correcao: repetir o predicado de cada indice parcial no ON CONFLICT.

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
  select p_pedido_id, 'seller', v_loja_id,
         coalesce(sum(coalesce(
           li.repasse_vendedor,
           li.valor - coalesce(li.repasse_ind, 0) - coalesce(li.repasse_afiliado, 0)
         )), 0)
  from public.linha_itens li
  where li.pedido_id = p_pedido_id
  having coalesce(sum(coalesce(
           li.repasse_vendedor,
           li.valor - coalesce(li.repasse_ind, 0) - coalesce(li.repasse_afiliado, 0)
         )), 0) > 0
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

-- Solicitacao do seller: elegivel depois da confirmacao de entrega, restrita ao
-- dono da loja. So popula/atualiza o ledger; quem dispara a transferencia PIX
-- continua sendo o app (lib/repasses.ts), como no gatilho de entrega.
create or replace function public.repasse_solicitar_pedido(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loja_id uuid;
  v_status text;
begin
  select p.loja_id, p.status_pedido into v_loja_id, v_status
  from public.pedidos p where p.id = p_pedido_id;

  if v_loja_id is null then
    raise exception 'Pedido não encontrado.';
  end if;

  if not public.is_admin() and not exists (
    select 1 from public.lojas l
    where l.id = v_loja_id and l.owner_id = auth.uid()
  ) then
    raise exception 'Pedido não pertence à sua loja.';
  end if;

  if v_status is null or v_status not in ('Pagamento Realizado', 'Em Separação', 'Enviado') then
    raise exception 'Pedido ainda nao esta pago (%).', coalesce(v_status, 'sem status');
  end if;

  -- Mesmo criterio de entrega de pedido_confirmar_entrega (0111): todo item do
  -- pedido precisa estar entregue. O fallback em linha_itens.entregue cobre os
  -- pedidos importados do Bubble, que tem a flag legada mas nunca ganharam
  -- linha em `entregas`. Pedido sem item nenhum tambem nao passa.
  if not exists (select 1 from public.linha_itens li where li.pedido_id = p_pedido_id)
     or exists (
       select 1
       from public.linha_itens li
       left join public.entregas en on en.linha_item_id = li.id
       where li.pedido_id = p_pedido_id
         and coalesce(en.status, case when li.entregue then 'Entregue' else 'Pendente' end)
             <> 'Entregue'
     ) then
    raise exception 'Repasse so pode ser solicitado depois que a entrega do pedido for confirmada.';
  end if;

  perform public.repasses_recalcular_pedido(p_pedido_id);
end;
$$;

revoke all on function public.repasse_solicitar_pedido(uuid) from public, anon;
grant execute on function public.repasse_solicitar_pedido(uuid) to authenticated;
