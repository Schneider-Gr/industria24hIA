-- 0045: atualizar_status_corrida (0040) só reconhecia parceiro_logistico via
-- join com parceiros_logisticos. Desde a 0043, um afiliado logístico puro
-- (sem cadastro em parceiros_logisticos) pode aceitar a corrida exclusiva
-- dele — mas ficaria travado no primeiro "Confirmar coleta", porque o join
-- exigia parceiro_id apontando pra uma linha em parceiros_logisticos que ele
-- não tem. Achado ao integrar a tela /afiliado/logistica com a corrida
-- automática (0043/0044).

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
