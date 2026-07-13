-- 0040: RPCs do módulo Parceiro Logístico. Toda escrita em corridas/leilões
-- passa por aqui (security definer, validação no banco); as tabelas não têm
-- policy de escrita para authenticated (exceto lances de leilão de fabricante
-- e posições GPS, cobertos por policy própria na 0039).

-- ============ Frete por tabela origem×destino ============
create or replace function public.calcular_frete(
  p_origem_cep text,
  p_destino_cep text,
  p_peso_kg numeric,
  p_urgencia text default 'normal'
) returns numeric
language plpgsql stable security definer set search_path = public as $$
declare
  v_o int := nullif(regexp_replace(p_origem_cep, '\D', '', 'g'), '')::int;
  v_d int := nullif(regexp_replace(p_destino_cep, '\D', '', 'g'), '')::int;
  v_f record;
begin
  select preco_base, preco_por_kg, multiplicador_urgente into v_f
  from frete_tabela
  where ativo
    and v_o between origem_cep_inicial and origem_cep_final
    and v_d between destino_cep_inicial and destino_cep_final
  order by (origem_cep_final - origem_cep_inicial) + (destino_cep_final - destino_cep_inicial) asc
  limit 1;
  if not found then
    return null; -- sem faixa: chamador decide o fallback (10% ad valorem no checkout)
  end if;
  return round(
    (v_f.preco_base + coalesce(p_peso_kg, 0) * v_f.preco_por_kg)
    * case when p_urgencia = 'urgente' then v_f.multiplicador_urgente else 1 end, 2);
end; $$;
grant execute on function public.calcular_frete(text, text, numeric, text) to authenticated, anon;

-- ============ Corridas ============
create or replace function public.publicar_corrida(
  p_origem_cep text, p_origem_endereco text,
  p_destino_cep text, p_destino_endereco text,
  p_peso_kg numeric, p_volume_m3 numeric, p_descricao_carga text,
  p_janela_inicio timestamptz, p_janela_fim timestamptz,
  p_urgencia text, p_modo text, p_pedido_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_sugerido numeric;
begin
  if auth.uid() is null then raise exception 'Faça login para publicar uma corrida.'; end if;
  if p_peso_kg is null or p_peso_kg <= 0 then raise exception 'Peso da carga inválido.'; end if;
  if p_janela_fim <= p_janela_inicio then raise exception 'Janela de horário inválida.'; end if;
  if p_urgencia not in ('normal', 'urgente') then raise exception 'Urgência inválida.'; end if;
  if p_modo not in ('primeiro_aceita', 'leilao') then raise exception 'Modo inválido.'; end if;
  if p_pedido_id is not null and not exists (
    select 1 from pedidos pe left join lojas l on l.id = pe.loja_id
    where pe.id = p_pedido_id and (pe.cliente_id = auth.uid() or l.owner_id = auth.uid())
  ) then
    raise exception 'Pedido não encontrado ou sem permissão.';
  end if;

  v_sugerido := calcular_frete(p_origem_cep, p_destino_cep, p_peso_kg, p_urgencia);

  insert into corridas (solicitante_id, pedido_id, origem_cep, origem_endereco,
    destino_cep, destino_endereco, peso_kg, volume_m3, descricao_carga,
    janela_inicio, janela_fim, urgencia, modo, preco_sugerido)
  values (auth.uid(), p_pedido_id, p_origem_cep, p_origem_endereco,
    p_destino_cep, p_destino_endereco, p_peso_kg, p_volume_m3, p_descricao_carga,
    p_janela_inicio, p_janela_fim, p_urgencia, p_modo, v_sugerido)
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.publicar_corrida(text, text, text, text, numeric, numeric, text, timestamptz, timestamptz, text, text, uuid) to authenticated;

create or replace function public.aceitar_corrida(p_corrida_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_p uuid;
  v_c record;
begin
  select id into v_p from parceiros_logisticos where user_id = auth.uid() and status = 'Aprovado';
  if v_p is null then raise exception 'Apenas parceiro logístico aprovado aceita corridas.'; end if;

  select * into v_c from corridas where id = p_corrida_id for update;
  if not found then raise exception 'Corrida não encontrada.'; end if;
  if v_c.status <> 'Publicada' then raise exception 'Corrida não está mais disponível.'; end if;
  if v_c.modo <> 'primeiro_aceita' then raise exception 'Esta corrida é por leilão: dê um lance.'; end if;

  update corridas set status = 'Aceita', parceiro_id = v_p,
    preco_final = coalesce(preco_sugerido, preco_final)
  where id = p_corrida_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (auth.uid(), 'parceiro', 'corrida.aceita', 'corridas', p_corrida_id,
          jsonb_build_object('parceiro_id', v_p));
end; $$;
grant execute on function public.aceitar_corrida(uuid) to authenticated;

create or replace function public.dar_lance_corrida(p_corrida_id uuid, p_valor numeric, p_prazo text) returns void
language plpgsql security definer set search_path = public as $$
declare v_p uuid;
begin
  select id into v_p from parceiros_logisticos where user_id = auth.uid() and status = 'Aprovado';
  if v_p is null then raise exception 'Apenas parceiro logístico aprovado dá lance.'; end if;
  if p_valor is null or p_valor <= 0 then raise exception 'Valor do lance inválido.'; end if;
  if not exists (select 1 from corridas where id = p_corrida_id and status = 'Publicada' and modo = 'leilao') then
    raise exception 'Corrida indisponível para lances.';
  end if;
  insert into corrida_lances (corrida_id, parceiro_id, valor, prazo)
  values (p_corrida_id, v_p, p_valor, p_prazo)
  on conflict (corrida_id, parceiro_id) do update set valor = excluded.valor, prazo = excluded.prazo, criado_em = now();
end; $$;
grant execute on function public.dar_lance_corrida(uuid, numeric, text) to authenticated;

create or replace function public.escolher_lance_corrida(p_lance_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_l record;
begin
  select cl.*, c.solicitante_id, c.status as corrida_status into v_l
  from corrida_lances cl join corridas c on c.id = cl.corrida_id
  where cl.id = p_lance_id for update of c;
  if not found then raise exception 'Lance não encontrado.'; end if;
  if v_l.solicitante_id <> auth.uid() then raise exception 'Só o solicitante escolhe o lance.'; end if;
  if v_l.corrida_status <> 'Publicada' then raise exception 'Corrida não está mais aberta.'; end if;

  update corridas set status = 'Aceita', parceiro_id = v_l.parceiro_id, preco_final = v_l.valor
  where id = v_l.corrida_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (auth.uid(), 'solicitante', 'corrida.lance_escolhido', 'corridas', v_l.corrida_id,
          jsonb_build_object('lance_id', p_lance_id, 'parceiro_id', v_l.parceiro_id, 'valor', v_l.valor));
end; $$;
grant execute on function public.escolher_lance_corrida(uuid) to authenticated;

create or replace function public.atualizar_status_corrida(
  p_corrida_id uuid, p_status text, p_foto_url text default null, p_assinatura_url text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_c record;
begin
  select c.*, p.user_id as parceiro_user into v_c
  from corridas c join parceiros_logisticos p on p.id = c.parceiro_id
  where c.id = p_corrida_id for update of c;
  if not found or v_c.parceiro_user <> auth.uid() then
    raise exception 'Corrida não encontrada ou você não é o parceiro dela.';
  end if;
  -- transições válidas: Aceita→Coletada→EmTransito→Entregue
  if not ((v_c.status, p_status) in (('Aceita','Coletada'), ('Coletada','EmTransito'), ('EmTransito','Entregue'))) then
    raise exception 'Transição de status inválida (% → %).', v_c.status, p_status;
  end if;
  if p_status = 'Entregue' and (p_foto_url is null or length(trim(p_foto_url)) = 0) then
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

create or replace function public.cancelar_corrida(p_corrida_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_c record;
begin
  select * into v_c from corridas where id = p_corrida_id and solicitante_id = auth.uid() for update;
  if not found then raise exception 'Corrida não encontrada.'; end if;
  if v_c.status not in ('Publicada', 'Aceita') then
    raise exception 'Corrida em andamento não pode ser cancelada.';
  end if;
  update corridas set status = 'Cancelada' where id = p_corrida_id;
end; $$;
grant execute on function public.cancelar_corrida(uuid) to authenticated;

-- ============ Leilão reverso entre fabricantes ============
create or replace function public.publicar_leilao_fabricante(
  p_titulo text, p_descricao text, p_volume text,
  p_categoria_id uuid, p_prazo_desejado date, p_janela_fim timestamptz
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  if length(trim(coalesce(p_titulo, ''))) = 0 or length(trim(coalesce(p_descricao, ''))) = 0
     or length(trim(coalesce(p_volume, ''))) = 0 then
    raise exception 'Preencha título, descrição e volume.';
  end if;
  if p_janela_fim <= now() then raise exception 'Janela do leilão deve terminar no futuro.'; end if;

  insert into leiloes_fabricantes (comprador_id, categoria_id, titulo, descricao, volume, prazo_desejado, janela_fim)
  values (auth.uid(), p_categoria_id, p_titulo, p_descricao, p_volume, p_prazo_desejado, p_janela_fim)
  returning id into v_id;
  return v_id;
end; $$;
grant execute on function public.publicar_leilao_fabricante(text, text, text, uuid, date, timestamptz) to authenticated;

create or replace function public.dar_lance_leilao(
  p_leilao_id uuid, p_preco numeric, p_prazo text, p_condicoes text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_loja uuid;
begin
  select id into v_loja from lojas where owner_id = auth.uid() and situacao = 'Ativa' limit 1;
  if v_loja is null then raise exception 'Apenas lojista com loja Ativa dá lance.'; end if;
  if p_preco is null or p_preco <= 0 then raise exception 'Preço inválido.'; end if;
  if length(trim(coalesce(p_prazo, ''))) = 0 then raise exception 'Informe o prazo.'; end if;
  if not exists (select 1 from leiloes_fabricantes where id = p_leilao_id and status = 'Aberto' and janela_fim > now()) then
    raise exception 'Leilão encerrado ou inexistente.';
  end if;
  insert into leilao_lances (leilao_id, loja_id, preco, prazo, condicoes)
  values (p_leilao_id, v_loja, p_preco, p_prazo, p_condicoes)
  on conflict (leilao_id, loja_id) do update
    set preco = excluded.preco, prazo = excluded.prazo, condicoes = excluded.condicoes, criado_em = now();
end; $$;
grant execute on function public.dar_lance_leilao(uuid, numeric, text, text) to authenticated;

-- Adjudicar marca o vencedor e encerra; a compra em si fecha entre as partes
-- (v1). ponytail: gerar pedido automático exigiria produto de catálogo; upgrade
-- quando houver "produto sob encomenda" (MPDD-42).
create or replace function public.adjudicar_leilao(p_leilao_id uuid, p_lance_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_l record;
begin
  select * into v_l from leiloes_fabricantes where id = p_leilao_id and comprador_id = auth.uid() for update;
  if not found then raise exception 'Leilão não encontrado ou sem permissão.'; end if;
  if v_l.status <> 'Aberto' then raise exception 'Leilão já encerrado.'; end if;
  if not exists (select 1 from leilao_lances where id = p_lance_id and leilao_id = p_leilao_id) then
    raise exception 'Lance não pertence a este leilão.';
  end if;
  update leiloes_fabricantes set status = 'Adjudicado', lance_vencedor = p_lance_id where id = p_leilao_id;
  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (auth.uid(), 'comprador', 'leilao.adjudicado', 'leiloes_fabricantes', p_leilao_id,
          jsonb_build_object('lance_vencedor', p_lance_id));
end; $$;
grant execute on function public.adjudicar_leilao(uuid, uuid) to authenticated;
