-- 0042: roteirização deixa de ser 100% automática. O webhook do Asaas
-- (criarRotaParaPedido) passava a atribuir sozinho o primeiro afiliado
-- logístico Aprovado da loja — sem intervenção do seller. Achado do dono
-- (PRD 04): o seller precisa ESCOLHER manualmente qual parceiro atende
-- cada rota, entre duas fontes hoje paralelas e desconectadas:
--   (a) afiliacoes (tipo='logistica'), aprovados pelo próprio seller;
--   (b) parceiros_logisticos, cadastro de plataforma aprovado pelo admin
--       (módulo de corridas, 0039/0040).
-- Esta migration: (1) nova fase 'Pendente' em rotas (nasce sem parceiro/
-- afiliado); (2) RLS de leitura/escrita do seller sobre as rotas da sua
-- loja; (3) RPC de leitura unificada dos dois tipos de parceiro
-- disponíveis; (4) RPC de atribuição (aceita afiliado OU parceiro, nunca
-- os dois); (5) RPC de progresso de status pelo lado que foi atribuído;
-- (6) chave PIX do parceiro de plataforma, mesmo padrão da 0035 (guard +
-- RPC dedicada) — split do Asaas foi descartado em 10/07
-- (docs/e4-split-repasse-bpmn.md); a transferência em si fica pendente
-- (D-E4.1), aqui só preparamos o cadastro da chave.

-- ============ 1. Rotas nascem Pendente até o seller atribuir ============
alter table public.rotas drop constraint rotas_status_check;
alter table public.rotas add constraint rotas_status_check
  check (status in ('Pendente', 'Atribuida', 'EmTransito', 'Entregue'));
alter table public.rotas alter column status set default 'Pendente';

-- ============ 2. RLS: seller lê/atribui as rotas da própria loja ============
create policy rotas_seller_read on public.rotas
  for select using (
    exists (
      select 1 from pedidos pe join lojas l on l.id = pe.loja_id
      where pe.id = rotas.pedido_id and l.owner_id = auth.uid()
    )
  );
-- escrita da rota em si (parceiro_id/afiliado_id/status) só pela RPC abaixo
-- (security definer bypassa RLS); nenhuma policy de UPDATE para seller.

-- ============ 3. Chave PIX do parceiro (paridade com lojas/0035) ============
alter table public.parceiros_logisticos
  add column if not exists chave_pix text,
  add column if not exists tipo_chave_pix text,
  add column if not exists chave_pix_confirmada_em timestamptz;

create or replace function public.guard_parceiro_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status
     and not (auth.uid() is null or public.is_admin()) then
    raise exception 'Apenas admin altera o status do parceiro (moderação).';
  end if;
  if tg_op = 'INSERT' and new.status <> 'Pendente'
     and not (auth.uid() is null or public.is_admin()) then
    raise exception 'Parceiro novo nasce Pendente; aprovação é do admin.';
  end if;
  if tg_op = 'UPDATE'
     and (new.chave_pix is distinct from old.chave_pix
          or new.tipo_chave_pix is distinct from old.tipo_chave_pix)
     and coalesce(current_setting('app.chave_pix_rpc', true), '') <> 'on' then
    raise exception 'Troca de chave PIX só pela função alterar_chave_pix_parceiro.';
  end if;
  return new;
end; $$;

create or replace function public.alterar_chave_pix_parceiro(
  p_chave_pix text,
  p_tipo_chave_pix text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_digitos text;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  if p_tipo_chave_pix not in ('CNPJ', 'CPF', 'EMAIL', 'PHONE') then
    raise exception 'Tipo de chave PIX inválido.';
  end if;
  if p_chave_pix is null or length(trim(p_chave_pix)) = 0 then
    raise exception 'Chave PIX não pode ser vazia.';
  end if;

  v_digitos := regexp_replace(p_chave_pix, '\D', '', 'g');
  if p_tipo_chave_pix = 'CPF' and length(v_digitos) <> 11 then
    raise exception 'CPF inválido: deve ter 11 dígitos.';
  elsif p_tipo_chave_pix = 'CNPJ' and length(v_digitos) <> 14 then
    raise exception 'CNPJ inválido: deve ter 14 dígitos.';
  elsif p_tipo_chave_pix = 'EMAIL' and p_chave_pix !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'E-mail inválido.';
  elsif p_tipo_chave_pix = 'PHONE' and length(v_digitos) not between 10 and 13 then
    raise exception 'Telefone inválido.';
  end if;

  select id into v_id from parceiros_logisticos where user_id = auth.uid();
  if v_id is null then raise exception 'Cadastro de parceiro não encontrado.'; end if;

  perform set_config('app.chave_pix_rpc', 'on', true);
  update parceiros_logisticos
    set chave_pix = p_chave_pix, tipo_chave_pix = p_tipo_chave_pix, chave_pix_confirmada_em = null
    where id = v_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (auth.uid(), 'parceiro', 'chave_pix.alterada', 'parceiros_logisticos', v_id,
          jsonb_build_object('chave_pix', p_chave_pix, 'tipo_chave_pix', p_tipo_chave_pix));
end; $$;
revoke all on function public.alterar_chave_pix_parceiro(text, text) from public;
grant execute on function public.alterar_chave_pix_parceiro(text, text) to authenticated;

-- ============ 4. Parceiros disponíveis (união afiliado de loja + plataforma) ============
create or replace function public.parceiros_disponiveis_loja(p_loja_id uuid)
returns table (origem text, id uuid, nome text, telefone text, nota_media numeric)
language sql stable security definer set search_path = public as $$
  select 'afiliado'::text, a.afiliado_id, coalesce(pl.nome, 'Afiliado logístico'), pl.telefone, pl.nota_media
  from afiliacoes a
  left join parceiros_logisticos pl on pl.user_id = a.afiliado_id
  where a.loja_id = p_loja_id and a.tipo = 'logistica' and a.status = 'Aprovada'
  union all
  select 'parceiro'::text, pl.id, pl.nome, pl.telefone, pl.nota_media
  from parceiros_logisticos pl
  where pl.status = 'Aprovado';
$$;
grant execute on function public.parceiros_disponiveis_loja(uuid) to authenticated;

-- ============ 5. Atribuir rota (seller escolhe) ============
create or replace function public.atribuir_rota(
  p_rota_id uuid,
  p_afiliado_id uuid default null,
  p_parceiro_id uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_rota record;
  v_telefone text;
  v_origem text;
  v_destino text;
begin
  if (p_afiliado_id is null) = (p_parceiro_id is null) then
    raise exception 'Informe exatamente um: afiliado OU parceiro.';
  end if;

  select r.*, pe.loja_id into v_rota
  from rotas r join pedidos pe on pe.id = r.pedido_id
  where r.id = p_rota_id for update of r;
  if not found then raise exception 'Rota não encontrada.'; end if;
  if not exists (select 1 from lojas l where l.id = v_rota.loja_id and l.owner_id = auth.uid()) then
    raise exception 'Sem permissão para atribuir esta rota.';
  end if;
  if v_rota.status <> 'Pendente' then
    raise exception 'Rota já atribuída (status: %).', v_rota.status;
  end if;

  if p_afiliado_id is not null then
    if not exists (
      select 1 from afiliacoes a where a.loja_id = v_rota.loja_id
        and a.afiliado_id = p_afiliado_id and a.tipo = 'logistica' and a.status = 'Aprovada'
    ) then
      raise exception 'Afiliado logístico não aprovado nesta loja.';
    end if;
    select telefone into v_telefone from parceiros_logisticos where user_id = p_afiliado_id;
  else
    if not exists (select 1 from parceiros_logisticos p where p.id = p_parceiro_id and p.status = 'Aprovado') then
      raise exception 'Parceiro logístico não aprovado.';
    end if;
    select telefone into v_telefone from parceiros_logisticos where id = p_parceiro_id;
  end if;

  update rotas set afiliado_id = p_afiliado_id, parceiro_id = p_parceiro_id, status = 'Atribuida'
  where id = p_rota_id;

  insert into auditoria_eventos (ator_id, ator_papel, acao, tabela, registro_id, dados_depois)
  values (auth.uid(), 'seller', 'rota.atribuida', 'rotas', p_rota_id,
          jsonb_build_object('afiliado_id', p_afiliado_id, 'parceiro_id', p_parceiro_id));
end; $$;
grant execute on function public.atribuir_rota(uuid, uuid, uuid) to authenticated;

-- ============ 6. Progresso de status pelo lado atribuído ============
create or replace function public.atualizar_status_rota(p_rota_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare v_rota record;
begin
  select * into v_rota from rotas where id = p_rota_id for update;
  if not found then raise exception 'Rota não encontrada.'; end if;
  if not (
    v_rota.afiliado_id = auth.uid()
    or exists (select 1 from parceiros_logisticos p where p.id = v_rota.parceiro_id and p.user_id = auth.uid())
  ) then
    raise exception 'Você não é o responsável por esta rota.';
  end if;
  if not ((v_rota.status, p_status) in (('Atribuida','EmTransito'), ('EmTransito','Entregue'))) then
    raise exception 'Transição de status inválida (% → %).', v_rota.status, p_status;
  end if;
  update rotas set status = p_status where id = p_rota_id;
end; $$;
grant execute on function public.atualizar_status_rota(uuid, text) to authenticated;
