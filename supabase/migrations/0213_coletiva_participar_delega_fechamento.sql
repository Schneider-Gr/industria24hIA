-- 0213: coletiva_participar volta a delegar o fechamento a coletiva_fechar.
--
-- A 0077 desenhou o ciclo da coletiva com lotes progressivos: bater a meta só
-- torna a coletiva Viável; ela segue aberta até o prazo, o teto de
-- participantes ou o último lote, e no fechamento todos pagam o melhor preço
-- atingido, com mínimo de participantes e frete conjunto rateado. Quem faz
-- isso é coletiva_fechar, chamada no fim de coletiva_participar.
--
-- A 0100 (limite de participantes) recriou coletiva_participar a partir de uma
-- base anterior à 0077 e a chamada sumiu; a 0189 regravou a função a partir de
-- produção (18/09) e manteve o defeito. Desde então, quem entra pela página
-- fecha a coletiva no instante em que a soma bate a meta, ao valor_unitario
-- fixo e com retirada na loja: lotes, mínimo de participantes e frete conjunto
-- configurados pelo seller em coletiva_regras não valem nesse caminho.
-- Conferido em produção em 05/10/2026: a definição vigente não contém
-- "coletiva_fechar", e a coletiva 66202f13 (mínimo de 3 participantes, 3
-- lotes) fechou Atingida com 2 participantes.
--
-- Esta migration restaura o corpo da 0077 (seção 5), que já traz o teto de
-- participantes da 0076. coletiva_fechar não muda: é a versão da 0189, com a
-- comissão pelo nó da taxonomia. Coletiva sem lotes (criada pela assinatura
-- antiga de coletiva_criar) continua fechando na meta, porque coletiva_fechar
-- trata lotes = '[]' como gatilho de fechamento.
--
-- ponytail: no ramo de prazo vencido, o perform coletiva_fechar é desfeito pelo
-- raise logo abaixo (mesma transação), como já era na 0077. Quem resolve prazo
-- vencido de verdade é /api/coletivas/tick; agendá-lo é assunto separado.

create or replace function public.coletiva_participar(
  p_coletiva_id uuid,
  p_quantidade int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_col record;
  v_prod record;
  v_ja boolean;
  v_participantes int;
  v_fecho jsonb;
  v_meu_pedido uuid;
begin
  if v_user is null then
    raise exception 'Faça login para participar da compra coletiva.';
  end if;
  if p_quantidade is null or p_quantidade < 1 then
    raise exception 'Quantidade inválida.';
  end if;

  select * into v_col from compras_coletivas where id = p_coletiva_id for update;
  if not found then
    raise exception 'Compra coletiva não encontrada.';
  end if;
  if v_col.status not in ('Aberta', 'Viavel') then
    raise exception 'Esta compra coletiva não está mais aberta (%).', v_col.status;
  end if;
  if v_col.prazo < now() then
    -- deixa o fechamento decidir entre Expirada e Atingida
    perform coletiva_fechar(p_coletiva_id);
    raise exception 'Esta compra coletiva já encerrou o prazo.';
  end if;

  select p.id, p.loja_id, p.nome, p.estoque_atual into v_prod
  from produtos p
  join lojas l on l.id = p.loja_id
  where p.id = v_col.produto_id
    and p.status_produto = 'Aprovado'
    and l.situacao = 'Ativa';
  if not found then
    raise exception 'Produto indisponível.';
  end if;
  if v_col.qtd_atual + p_quantidade > v_prod.estoque_atual then
    raise exception 'Estoque insuficiente de "%" (disponível: %).',
      v_prod.nome, v_prod.estoque_atual - v_col.qtd_atual;
  end if;

  select exists (
    select 1 from coletiva_participacoes
    where coletiva_id = v_col.id and user_id = v_user
  ) into v_ja;
  select count(*) into v_participantes
  from coletiva_participacoes where coletiva_id = v_col.id;

  if not v_ja and v_col.max_participantes is not null
     and v_participantes >= v_col.max_participantes then
    raise exception 'Esta coletiva já atingiu o máximo de % participantes.',
      v_col.max_participantes;
  end if;

  insert into coletiva_participacoes (coletiva_id, user_id, quantidade)
  values (v_col.id, v_user, p_quantidade)
  on conflict (coletiva_id, user_id)
  do update set quantidade = coletiva_participacoes.quantidade + excluded.quantidade;

  update compras_coletivas
  set qtd_atual = qtd_atual + p_quantidade
  where id = v_col.id
  returning * into v_col;

  perform coletiva_evento(v_col.id, 'participante_entrou',
    jsonb_build_object('quantidade', p_quantidade, 'qtd_atual', v_col.qtd_atual,
                       'novo', not v_ja));

  -- Lote desbloqueado pela entrada deste participante (marco = min_qtd do lote).
  perform coletiva_evento(v_col.id, 'lote_desbloqueado',
    jsonb_build_object('marco', (elem->>'min_qtd'),
                       'valor_unitario', (elem->>'valor_unitario'),
                       'qtd_atual', v_col.qtd_atual))
  from jsonb_array_elements(v_col.lotes) elem
  where (elem->>'min_qtd')::int <= v_col.qtd_atual;

  -- Avalia viabilidade e os gatilhos de fechamento (lote final / lotação).
  v_fecho := coletiva_fechar(v_col.id);

  select pedido_id into v_meu_pedido from coletiva_participacoes
  where coletiva_id = v_col.id and user_id = v_user;

  return jsonb_build_object(
    'status', v_fecho->>'status',
    'qtd_atual', v_col.qtd_atual,
    'meta_qtd', v_col.meta_qtd,
    'preco_atual', coletiva_preco_lote(v_col.lotes, v_col.qtd_atual, v_col.preco_base),
    'pedido_id', v_meu_pedido
  );
end;
$$;

revoke all on function public.coletiva_participar(uuid, int) from public;
grant execute on function public.coletiva_participar(uuid, int) to authenticated;
