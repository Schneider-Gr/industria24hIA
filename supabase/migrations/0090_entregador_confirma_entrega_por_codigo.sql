-- 0090: entregador confirma a entrega com o código do comprador (PRD 001).
--
-- Antes, `pedido_confirmar_entrega` (0071) só aceitava o dono da loja. Na
-- entrega em domicílio o lojista não está no local, então o pedido ficava
-- pendente pro comprador mesmo depois de entregue: a corrida virava
-- 'Entregue' em `corridas`, mas `entregas` (fonte de fulfillment, 0009/0014)
-- não era tocada. Dois conceitos de "entregue" que não conversavam.
--
-- Agora o entregador responsável pela corrida daquele pedido também pode
-- confirmar. Isso derruba a premissa que a 0072 usou pra justificar código
-- de 4 dígitos ("só o dono da loja executa a RPC, não há superfície de força
-- bruta") — por isso entra junto o limite de 5 tentativas por pedido, que
-- vale só pra quem não é o dono da loja (o lojista mantém o fluxo de balcão
-- exatamente como estava).

alter table public.pedidos
  add column if not exists codigo_tentativas int not null default 0;

comment on column public.pedidos.codigo_tentativas is
  'Tentativas erradas de codigo_retirada por quem nao e dono da loja (0090). Zera no acerto.';

create or replace function public.pedido_confirmar_entrega(
  p_pedido_id uuid,
  p_codigo text
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_ped record;
  v_n int;
  v_eh_dono boolean;
  v_eh_entregador boolean;
  c_limite_tentativas constant int := 5;
begin
  if v_user is null then
    raise exception 'Faça login.';
  end if;

  select p.id, p.status_pedido, p.codigo_retirada, p.codigo_tentativas, l.owner_id
    into v_ped
  from pedidos p
  join lojas l on l.id = p.loja_id
  where p.id = p_pedido_id;
  if not found then
    raise exception 'Pedido não encontrado.';
  end if;

  v_eh_dono := v_ped.owner_id = v_user;

  -- Entregador da corrida deste pedido: afiliado exclusivo ou parceiro
  -- vinculado, mesma regra de responsabilidade usada na 0045.
  select exists (
    select 1 from corridas c
    where c.pedido_id = p_pedido_id
      and c.status <> 'Cancelada'
      and (
        c.afiliado_exclusivo_id = v_user
        or exists (
          select 1 from parceiros_logisticos pl
          where pl.id = c.parceiro_id and pl.user_id = v_user
        )
      )
  ) into v_eh_entregador;

  if not (v_eh_dono or v_eh_entregador) then
    raise exception 'Apenas o dono da loja ou o entregador da corrida pode confirmar este pedido.';
  end if;

  if v_ped.status_pedido <> 'Pagamento Realizado' then
    raise exception 'Pedido ainda não está pago (%).', v_ped.status_pedido;
  end if;

  -- Idempotência: pedido já entregue não erra nem duplica (o lojista pode ter
  -- confirmado no balcão antes do entregador tentar).
  if not exists (
    select 1 from linha_itens li
    join entregas en on en.linha_item_id = li.id
    where li.pedido_id = p_pedido_id and en.status <> 'Entregue'
  ) and exists (
    select 1 from linha_itens li
    join entregas en on en.linha_item_id = li.id
    where li.pedido_id = p_pedido_id
  ) then
    return 0;
  end if;

  -- Limite de tentativas só pra quem não é dono da loja (PRD 001, US02).
  if not v_eh_dono and v_ped.codigo_tentativas >= c_limite_tentativas then
    raise exception 'Muitas tentativas incorretas. Peça ao lojista para concluir esta entrega.';
  end if;

  -- Código errado RETORNA -1 em vez de `raise`: a exceção reverteria o próprio
  -- incremento do contador, e o limite nunca chegaria a 5. Quem chama traduz
  -- o -1 em mensagem de erro pro usuário.
  if v_ped.codigo_retirada is null
     or v_ped.codigo_retirada <> regexp_replace(coalesce(p_codigo, ''), '\D', '', 'g') then
    if not v_eh_dono then
      update pedidos set codigo_tentativas = codigo_tentativas + 1 where id = p_pedido_id;
    end if;
    return -1;
  end if;

  insert into entregas (linha_item_id, status, atualizado_em)
  select li.id, 'Entregue', now()
  from linha_itens li
  where li.pedido_id = p_pedido_id
  on conflict (linha_item_id)
  do update set status = 'Entregue', atualizado_em = now();
  get diagnostics v_n = row_count;

  update pedidos set codigo_tentativas = 0 where id = p_pedido_id;

  return v_n;
end;
$$;

revoke all on function public.pedido_confirmar_entrega(uuid, text) from public;
grant execute on function public.pedido_confirmar_entrega(uuid, text) to authenticated;

-- A 0045 exigia foto em toda entrega, porque a foto era a única evidência que
-- existia. Agora a corrida com pedido tem o código do comprador, que é
-- evidência mais forte (autorização de quem comprou). A foto continua
-- obrigatória só na corrida sem pedido vinculado — frete avulso, onde não há
-- código pra pedir.
create or replace function public.atualizar_status_corrida(
  p_corrida_id uuid, p_status text, p_foto_url text default null, p_assinatura_url text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_c record;
begin
  select * into v_c from corridas where id = p_corrida_id for update;
  if not found or not (
    v_c.afiliado_exclusivo_id = auth.uid()
    or exists (select 1 from parceiros_logisticos p where p.id = v_c.parceiro_id and p.user_id = auth.uid())
  ) then
    raise exception 'Corrida não encontrada ou você não é o responsável por ela.';
  end if;
  -- transições válidas: Aceita→Coletada→EmTransito→Entregue
  if not ((v_c.status, p_status) in (('Aceita','Coletada'), ('Coletada','EmTransito'), ('EmTransito','Entregue'))) then
    raise exception 'Transição de status inválida (% → %).', v_c.status, p_status;
  end if;
  if p_status = 'Entregue'
     and v_c.pedido_id is null
     and (p_foto_url is null or length(trim(p_foto_url)) = 0) then
    raise exception 'Entrega exige foto de confirmação.';
  end if;

  update corridas set status = p_status,
    foto_entrega_url = coalesce(p_foto_url, foto_entrega_url),
    assinatura_url = coalesce(p_assinatura_url, assinatura_url)
  where id = p_corrida_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_antes, dados_depois)
  values (auth.uid(), 'parceiro', 'corrida.status', 'corridas', p_corrida_id,
          jsonb_build_object('status', v_c.status), jsonb_build_object('status', p_status));
end; $$;

grant execute on function public.atualizar_status_corrida(uuid, text, text, text) to authenticated;
