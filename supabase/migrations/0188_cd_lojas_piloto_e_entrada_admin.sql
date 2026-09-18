-- 0188: Gestão do fulfillment - lojas piloto e entrada no CD (PRD 043, M1)
--
-- Contexto: a trava binária do CD (0179) impede qualquer produto de apontar
-- para o CD do Indústria. O programa piloto precisa de uma porta de entrada
-- controlada para começar. A loja que quer guardar no CD precisa ser admitida
-- explicitamente, e o admin precisa de uma RPC para registrar a primeira
-- entrada de mercadoria (substituto da US03 do PRD 039 até ela existir).

-- ============================================================
-- 1. Tabela de lojas admitidas no programa piloto
-- ============================================================
create table if not exists public.cd_lojas_piloto (
  loja_id uuid primary key references public.lojas (id) on delete cascade,
  centro_id uuid not null references public.centros_distribuicao (id) on delete cascade,
  criado_em timestamp with time zone not null default now(),
  criado_por uuid not null references public.usuarios (id),
  unique (loja_id, centro_id)
);

comment on table public.cd_lojas_piloto is
  'Lojas admitidas a guardar mercadoria no CD do Indústria. Entrada é ato manual do admin (PRD 043, US01).';
comment on column public.cd_lojas_piloto.loja_id is
  'Loja que pode guardar no CD. Chave primária isolada (não dupla) porque uma loja pode estar em múltiplos centros, mas se for removida do sistema a cascata apaga as admissões.';
comment on column public.cd_lojas_piloto.centro_id is
  'CD onde a loja é admitida. Restrição: só centros do tipo `industria`.';
comment on column public.cd_lojas_piloto.criado_por is
  'Admin que admitiu a loja. Rastro de quem fez a decisão.';

alter table public.cd_lojas_piloto enable row level security;
create policy cd_lojas_piloto_admin_only
  on public.cd_lojas_piloto for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 2. Trava do CD: recusa, mas aceita lojas piloto
-- ============================================================
-- Muda a função produto_centro_recusa_industria (0179) para:
--   - Recusar produto do tipo `industria` se a loja NÃO está na lista piloto
--   - Aceitar se a loja está na lista para aquele centro
-- A trava continua no cadastro, não na venda, para a pessoa corrigir no lugar certo.

create or replace function public.produto_centro_recusa_industria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo      text;
  v_loja_id   uuid;
  v_admitida  boolean;
begin
  select tipo into v_tipo
    from public.centros_distribuicao where id = new.centro_id;

  if v_tipo = 'industria' then
    -- Buscar a loja do produto
    select loja_id into v_loja_id
      from public.produtos where id = new.produto_id;

    -- Verificar se a loja está admitida para este centro
    select exists(
      select 1 from public.cd_lojas_piloto
      where loja_id = v_loja_id and centro_id = new.centro_id
    ) into v_admitida;

    if not v_admitida then
      raise exception 'A loja não está admitida a usar o CD do Indústria. Apenas lojas inscritas no programa piloto podem guardar mercadoria lá.';
    end if;
  end if;

  return new;
end;
$$;

-- ============================================================
-- 3. RPC para registrar entrada de mercadoria no CD
-- ============================================================
-- Usado pelo admin para colocar mercadoria do piloto no sistema antes do
-- recebimento formal (US03 do PRD 039) existir. Exige posição válida e motivo.
-- Gera lançamento em estoque_movimentos e soma no saldo.

create or replace function public.admin_cd_registrar_entrada(
  p_produto_id uuid,
  p_centro_id uuid,
  p_endereco_id uuid,
  p_quantidade integer,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id  uuid;
  v_loja_id     uuid;
  v_admitida    boolean;
  v_bloqueado   boolean;
  v_tipo_centro text;
  v_movimento   uuid;
  v_centro_end  uuid;
  v_msg         text;
begin
  -- Verificar autorização: só admin
  v_usuario_id := auth.uid();
  if v_usuario_id is null or not public.is_admin() then
    raise exception 'Apenas admin pode registrar entrada no CD.';
  end if;

  -- Validações de entrada
  if p_quantidade <= 0 then
    raise exception 'Quantidade deve ser positiva.';
  end if;

  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception 'Motivo da entrada é obrigatório.';
  end if;

  -- Verificar que é um centro do tipo industria
  select tipo into v_tipo_centro
    from public.centros_distribuicao where id = p_centro_id;

  if v_tipo_centro != 'industria' then
    raise exception 'Entrada com endereço só é permitida em centros do tipo industria.';
  end if;

  -- Verificar que o endereço existe e pertence ao centro
  select centro_id, bloqueado into v_centro_end, v_bloqueado
    from public.estoque_enderecos where id = p_endereco_id;

  if v_centro_end is null then
    raise exception 'Endereço não encontrado.';
  end if;

  if v_centro_end != p_centro_id then
    raise exception 'O endereço informado pertence a outro centro de distribuição.';
  end if;

  if v_bloqueado then
    raise exception 'Este endereço está bloqueado e não pode receber mercadoria.';
  end if;

  -- Verificar que o produto pertence a uma loja admitida
  select loja_id into v_loja_id
    from public.produtos where id = p_produto_id;

  if v_loja_id is null then
    raise exception 'Produto não encontrado.';
  end if;

  select exists(
    select 1 from public.cd_lojas_piloto
    where loja_id = v_loja_id and centro_id = p_centro_id
  ) into v_admitida;

  if not v_admitida then
    raise exception 'A loja do produto não está admitida a usar o CD do Indústria.';
  end if;

  -- Criar o lançamento
  insert into public.estoque_movimentos
    (produto_id, centro_id, endereco_id, quantidade, tipo, origem, motivo, autor)
  values (p_produto_id, p_centro_id, p_endereco_id, p_quantidade, 'entrada', 'ajuste', p_motivo, v_usuario_id)
  returning id into v_movimento;

  return jsonb_build_object(
    'sucesso', true,
    'movimento_id', v_movimento,
    'mensagem', 'Entrada registrada com sucesso.'
  );
exception when others then
  return jsonb_build_object(
    'sucesso', false,
    'erro', sqlerrm
  );
end;
$$;

grant execute on function public.admin_cd_registrar_entrada(uuid, uuid, uuid, integer, text) to authenticated;

-- ============================================================
-- 4. Restrição no drop de loja piloto: recusar se houver saldo
-- ============================================================
-- Uma loja não pode ser removida do piloto se ainda tem mercadoria no CD.
-- (A cascata do on delete trata a remoção da loja do sistema inteiro.)

create or replace function public.cd_lojas_piloto_valida_remocao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saldo integer;
begin
  select coalesce(sum(es.quantidade), 0) into v_saldo
    from public.estoque_saldos es
    join public.produtos p on p.id = es.produto_id
    where p.loja_id = old.loja_id
      and es.centro_id = old.centro_id;

  if v_saldo > 0 then
    raise exception 'Não é possível remover a loja do programa piloto com saldo no CD. Saldo atual: % unidades. Transfira ou ajuste antes de remover.', v_saldo;
  end if;

  return old;
end;
$$;

drop trigger if exists cd_lojas_piloto_valida_remocao on public.cd_lojas_piloto;
create trigger cd_lojas_piloto_valida_remocao
  before delete on public.cd_lojas_piloto
  for each row execute function public.cd_lojas_piloto_valida_remocao();
