-- 0112: confirmação de entrega pública, sem login — transportador terceiro
-- (frete avulso, sem conta na plataforma) informa o número do pedido
-- (id_venda) + o código do comprador e fecha a entrega, disparando o
-- repasse automático (0111) exatamente como as confirmações autenticadas
-- (parceiro/afiliado/lojista).
--
-- Escopo pedido explicitamente pelo dono (2026-08-07): 3ª via de
-- confirmação SEM persona/login, distinta das duas já existentes (parceiro
-- logístico e afiliado logístico). Trade-off aceito conscientemente: sem
-- login não há accountability forte de QUEM confirmou — mitigado por (a)
-- exigir nome/contato do entregador, logado em auditoria_eventos; (b) o
-- limite de 5 tentativas por pedido (US02, PRD 001) passa a valer SEMPRE
-- aqui, sem a isenção de "dono da loja" que existe na via autenticada,
-- porque toda chamada é anônima. Mesma superfície de ataque (id_venda de
-- 10 caracteres + código de 4 dígitos) que a PRD 001 já aceitou para o
-- entregador autenticado — a diferença é que aqui ninguém precisa estar
-- logado para tentar, então não há rate limit por usuário, só por pedido.

create or replace function public.pedido_confirmar_entrega_publico(
  p_id_venda text,
  p_codigo text,
  p_nome_entregador text
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ped record;
  v_n int;
  c_limite_tentativas constant int := 5;
begin
  if p_nome_entregador is null or length(trim(p_nome_entregador)) < 2 then
    raise exception 'Informe seu nome.';
  end if;

  select p.id, p.status_pedido, p.codigo_retirada, p.codigo_tentativas
    into v_ped
  from pedidos p
  where p.id_venda = upper(trim(coalesce(p_id_venda, '')));
  if not found then
    raise exception 'Pedido não encontrado. Confira o número do pedido.';
  end if;

  if v_ped.status_pedido <> 'Pagamento Realizado' then
    raise exception 'Pedido ainda não está pago (%).', v_ped.status_pedido;
  end if;

  -- Idempotência: mesma regra da pedido_confirmar_entrega (0090).
  if not exists (
    select 1 from linha_itens li
    join entregas en on en.linha_item_id = li.id
    where li.pedido_id = v_ped.id and en.status <> 'Entregue'
  ) and exists (
    select 1 from linha_itens li
    join entregas en on en.linha_item_id = li.id
    where li.pedido_id = v_ped.id
  ) then
    return 0;
  end if;

  -- Sem isenção de "dono": toda chamada por esta via é anônima.
  if v_ped.codigo_tentativas >= c_limite_tentativas then
    raise exception 'Muitas tentativas incorretas. Peça ao lojista para concluir esta entrega.';
  end if;

  if v_ped.codigo_retirada is null
     or v_ped.codigo_retirada <> regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g') then
    update pedidos set codigo_tentativas = codigo_tentativas + 1 where id = v_ped.id;
    insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
    values (null, 'entregador_publico', 'entrega.codigo_incorreto', 'pedidos', v_ped.id,
            jsonb_build_object('nome_entregador', trim(p_nome_entregador)));
    return -1;
  end if;

  insert into entregas (linha_item_id, status, atualizado_em)
  select li.id, 'Entregue', now()
  from linha_itens li
  where li.pedido_id = v_ped.id
  on conflict (linha_item_id)
  do update set status = 'Entregue', atualizado_em = now();
  get diagnostics v_n = row_count;

  update pedidos set codigo_tentativas = 0 where id = v_ped.id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (null, 'entregador_publico', 'entrega.confirmada', 'pedidos', v_ped.id,
          jsonb_build_object('nome_entregador', trim(p_nome_entregador)));

  -- Recalcula o ledger de repasses — mesmo gatilho da via autenticada
  -- (0111); quem dispara a transferência PIX de fato é o app.
  perform public.repasses_recalcular_pedido(v_ped.id);

  return v_n;
end;
$$;

revoke all on function public.pedido_confirmar_entrega_publico(text, text, text) from public;
grant execute on function public.pedido_confirmar_entrega_publico(text, text, text) to anon, authenticated;
