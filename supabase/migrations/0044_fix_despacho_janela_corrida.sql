-- 0044: fix despachar_corrida_automatica (0043) — corridas.janela_inicio e
-- janela_fim são NOT NULL (migration 0039), mas o insert do despacho
-- automático não preenchia essas colunas. Em produção isso faria a RPC
-- falhar sempre (capturado pelo try/catch do webhook, não derruba o
-- pagamento, mas NENHUMA corrida era criada de verdade — achado em QA
-- end-to-end antes de gerar tráfego real). Janela: início imediato,
-- 4h de prazo pro parceiro coletar (ponytail: fixo, ajustar se virar
-- reclamação real de prazo curto/longo).

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
    peso_kg, janela_inicio, janela_fim, modo, preco_sugerido, preco_final,
    afiliado_exclusivo_id, exclusividade_fim
  )
  select
    pe.cliente_id, p_pedido_id,
    coalesce(v_loja.cep, ''), concat_ws(', ', v_loja.rua, v_loja.numero, v_loja.cidade, v_loja.estado, v_loja.cep),
    v_item.entrega_cep, concat_ws(', ', v_item.entrega_rua, v_item.entrega_numero, v_item.entrega_bairro, v_item.entrega_cidade, v_item.entrega_complemento),
    1, -- peso_kg placeholder: produtos não têm peso confiável hoje (só 89/358, ver rebuild); NOT NULL exige > 0
    now(), now() + interval '4 hours',
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
