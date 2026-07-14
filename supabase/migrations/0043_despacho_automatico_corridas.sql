-- 0042: despacho automático de corrida no pagamento do pedido, em vez de
-- atribuição manual do seller. Reaproveita o motor de `corridas` (feed +
-- aceite + leilão, 0039/0040) para pedidos pagos, no lugar de criar uma
-- `rota` Pendente sem dono.
--
-- Decisão de frete (fechada com o dono, 13/07/2026): a corrida nascida de
-- um pedido usa como preco_final o MESMO valor_frete já cobrado do
-- comprador no checkout (faixa_cep) — NÃO usa calcular_frete/frete_tabela,
-- que segue existindo só para corridas avulsas publicadas manualmente sem
-- pedido. Isso evita dois preços de frete divergentes para o mesmo caso.
--
-- Janela de exclusividade: o afiliado logístico Aprovado da loja (se
-- houver) tem 5 min de exclusividade para aceitar antes da corrida abrir
-- pro pool geral de parceiros de plataforma. Calculada em tempo de leitura
-- (exclusividade_fim < now()), sem cron/job.

-- ============ 1. Colunas novas em corridas ============
alter table public.corridas
  add column if not exists afiliado_exclusivo_id uuid references auth.users (id),
  add column if not exists exclusividade_fim timestamptz;

-- ============ 2. Policy de leitura do feed respeita a exclusividade ============
drop policy if exists corridas_parceiro_read on public.corridas;
create policy corridas_parceiro_read on public.corridas
  for select using (
    exists (select 1 from parceiros_logisticos p
            where p.user_id = auth.uid() and p.status = 'Aprovado'
              and (
                corridas.parceiro_id = p.id
                or (
                  corridas.status = 'Publicada'
                  and (corridas.afiliado_exclusivo_id is null
                       or corridas.exclusividade_fim < now())
                )
              ))
  );

-- afiliado logístico exclusivo lê a própria corrida mesmo dentro da janela
-- (não tem cadastro em parceiros_logisticos necessariamente):
create policy corridas_afiliado_exclusivo_read on public.corridas
  for select using (afiliado_exclusivo_id = auth.uid());

-- ============ 3. aceitar_corrida: também aceita afiliado logístico puro ============
create or replace function public.aceitar_corrida(p_corrida_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_p uuid;              -- id em parceiros_logisticos, se houver
  v_afiliado boolean := false;
  v_c record;
begin
  select id into v_p from parceiros_logisticos where user_id = auth.uid() and status = 'Aprovado';

  select * into v_c from corridas where id = p_corrida_id for update;
  if not found then raise exception 'Corrida não encontrada.'; end if;
  if v_c.status <> 'Publicada' then raise exception 'Corrida não está mais disponível.'; end if;
  if v_c.modo <> 'primeiro_aceita' then raise exception 'Esta corrida é por leilão: dê um lance.'; end if;

  -- janela de exclusividade: só o afiliado_exclusivo_id aceita antes do prazo
  if v_c.afiliado_exclusivo_id is not null and v_c.exclusividade_fim > now()
     and v_c.afiliado_exclusivo_id <> auth.uid() then
    raise exception 'Corrida em janela de exclusividade de outro afiliado.';
  end if;

  if v_c.afiliado_exclusivo_id = auth.uid() then
    v_afiliado := true;
  elsif v_p is null then
    raise exception 'Apenas parceiro logístico aprovado ou afiliado logístico aceita corridas.';
  end if;

  update corridas set status = 'Aceita',
    parceiro_id = v_p,
    afiliado_exclusivo_id = case when v_afiliado then auth.uid() else null end
  where id = p_corrida_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (auth.uid(), case when v_afiliado then 'afiliado' else 'parceiro' end,
          'corrida.aceita', 'corridas', p_corrida_id,
          jsonb_build_object('parceiro_id', v_p, 'afiliado_exclusivo', v_afiliado));
end; $$;
grant execute on function public.aceitar_corrida(uuid) to authenticated;

-- ============ 4. Despacho automático a partir de um pedido pago ============
create or replace function public.despachar_corrida_automatica(p_pedido_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_ja_existe uuid;
  v_pedido record;
  v_item record;
  v_loja record;
  v_afiliado uuid;
  v_id uuid;
begin
  select id into v_ja_existe from corridas where pedido_id = p_pedido_id;
  if v_ja_existe is not null then
    return v_ja_existe; -- idempotente
  end if;

  select id, loja_id into v_pedido from pedidos where id = p_pedido_id;
  if not found then raise exception 'Pedido não encontrado.'; end if;

  select entrega_cep, entrega_rua, entrega_numero, entrega_bairro,
         entrega_cidade, entrega_complemento, valor_frete
    into v_item
  from linha_itens
  where pedido_id = p_pedido_id and retirar_na_loja = false and entrega_cep is not null
  limit 1;
  if not found then
    return null; -- retirada na loja: sem corrida
  end if;

  select cep, rua, numero, cidade, estado into v_loja
  from lojas where id = v_pedido.loja_id;

  select afiliado_id into v_afiliado
  from afiliacoes
  where loja_id = v_pedido.loja_id and tipo = 'logistica' and status = 'Aprovada'
  order by created_at asc
  limit 1;

  insert into corridas (
    solicitante_id, pedido_id,
    origem_cep, origem_endereco,
    destino_cep, destino_endereco,
    peso_kg, modo, preco_sugerido, preco_final,
    afiliado_exclusivo_id, exclusividade_fim
  )
  select
    pe.cliente_id, p_pedido_id,
    coalesce(v_loja.cep, ''), concat_ws(', ', v_loja.rua, v_loja.numero, v_loja.cidade, v_loja.estado, v_loja.cep),
    v_item.entrega_cep, concat_ws(', ', v_item.entrega_rua, v_item.entrega_numero, v_item.entrega_bairro, v_item.entrega_cidade, v_item.entrega_complemento),
    1, -- peso_kg placeholder: produtos não têm peso confiável hoje (só 89/358, ver rebuild); NOT NULL exige > 0
    'primeiro_aceita',
    v_item.valor_frete, v_item.valor_frete,
    v_afiliado, case when v_afiliado is not null then now() + interval '5 minutes' else null end
  from pedidos pe where pe.id = p_pedido_id
  returning id into v_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (null, 'sistema', 'corrida.despacho_automatico', 'corridas', v_id,
          jsonb_build_object('pedido_id', p_pedido_id, 'afiliado_exclusivo_id', v_afiliado));

  return v_id;
end; $$;
revoke all on function public.despachar_corrida_automatica(uuid) from public, anon;
grant execute on function public.despachar_corrida_automatica(uuid) to authenticated, service_role;
