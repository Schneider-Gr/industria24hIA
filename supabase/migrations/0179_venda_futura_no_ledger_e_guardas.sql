-- 0179: fecha três furos abertos pela revisão do módulo de fulfillment (17/09/2026).
--
-- Contexto: a 0175 deu extrato auditável ao estoque, a 0176 deu endereço, a 0177
-- deu dono e prazo à mercadoria prometida e a 0178 criou o CD do Indústria. A
-- revisão das regras confrontada com produção achou três lacunas entre elas.
--
-- 1. Venda futura não existe no ledger. São 808 linhas e 15.599 unidades hoje.
--    O checkout decrementa `vendas_futuras.estoque` e nenhum lançamento explica
--    o movimento. A paridade entre o ledger e `produtos.estoque_atual` dá zero
--    divergentes porque os dois livros se ignoram nesse ponto, não porque batem.
--
-- 2. O CD do Indústria trava o checkout do primeiro produto apontado para ele.
--    `estoque_movimento_valida_endereco` (0176) exige endereço em centro
--    `industria`, e o espelhamento automático da 0175 nunca informa endereço,
--    porque quem escolhe a posição de saída é a separação, que é a US04 do PRD
--    039 e ainda não existe. Hoje são zero produtos apontados, então a falha é
--    latente: ela aparece no dia em que alguém cadastrar o primeiro.
--
-- 3. Quando não há centro resolvível, o espelhamento é pulado em silêncio. O
--    comportamento está certo (não dá para lançar sem centro), o silêncio não:
--    a paridade quebra e não fica rastro nenhum para investigar.

-- ============================================================
-- 1. Venda futura entra no ledger, em eixo próprio
-- ============================================================
-- Eixo próprio, e não lançamento comum, porque venda futura é mercadoria que
-- ainda não existe: ela não tem posição física, não está em centro nenhum e não
-- pode entrar em `estoque_saldos` sem inflar o saldo de um lugar real. O que ela
-- precisa é de extrato, que é o que esta coluna dá.
--
-- Consequência deliberada: a paridade do ledger com `produtos.estoque_atual`
-- passa a ser medida sobre os lançamentos com `venda_futura_id is null`. É a
-- mesma conta de antes, agora explícita em vez de acidental.

alter table public.estoque_movimentos
  add column if not exists venda_futura_id uuid references public.vendas_futuras (id) on delete set null;

create index if not exists estoque_movimentos_venda_futura_idx
  on public.estoque_movimentos (venda_futura_id)
  where venda_futura_id is not null;

comment on column public.estoque_movimentos.venda_futura_id is
  'Lançamento de pré-venda. Entra no extrato e NÃO entra em estoque_saldos nem no saldo por endereço: venda futura não tem posição física. A paridade com produtos.estoque_atual se mede sobre os lançamentos com esta coluna nula.';

-- O saldo por centro ignora pré-venda.
create or replace function public.estoque_aplicar_no_saldo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Pré-venda não ocupa lugar: fica no extrato e fora do saldo do centro.
  if new.venda_futura_id is not null then
    return new;
  end if;

  insert into public.estoque_saldos (produto_id, centro_id, quantidade)
  values (new.produto_id, new.centro_id, 0)
  on conflict (produto_id, centro_id) do nothing;

  update public.estoque_saldos
     set quantidade = quantidade + new.quantidade,
         atualizado_em = now()
   where produto_id = new.produto_id
     and centro_id  = new.centro_id;

  return new;
end;
$$;

-- ============================================================
-- 2. Guardas de endereço: pré-venda e saída do CD do Indústria
-- ============================================================
-- Duas mudanças sobre a versão da 0176:
--
-- (a) lançamento de pré-venda não aceita endereço, e não cai na exigência do
--     centro `industria`: não há posição para mercadoria que ainda não chegou;
-- (b) a exigência de endereço no centro `industria` passa a valer só para
--     ENTRADA. Guardar mercadoria sem dizer onde é o que faz a carga se perder,
--     e isso continua bloqueado. Já a saída por venda não tem como informar
--     posição enquanto a separação (US04 do PRD 039) não existir, e exigir um
--     dado que o sistema não sabe produzir só transforma a venda em erro.
--
-- A saída sem endereço deixa o livro por posição mais cheio que o saldo do
-- centro, e essa divergência é conhecida e temporária: ela fecha quando a
-- separação passar a informar de qual posição a mercadoria saiu. Enquanto isso,
-- a trava do bloco 3 impede que a situação aconteça de fato.
create or replace function public.estoque_movimento_valida_endereco()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo_centro   text;
  v_centro_do_end uuid;
  v_bloqueado     boolean;
begin
  if new.venda_futura_id is not null then
    if new.endereco_id is not null then
      raise exception 'Lançamento de venda futura não tem endereço de armazenagem: a mercadoria ainda não chegou.';
    end if;
    return new;
  end if;

  select tipo into v_tipo_centro
    from public.centros_distribuicao where id = new.centro_id;

  if new.endereco_id is null then
    -- Só entrada. A saída fica liberada até a separação existir (US04).
    if v_tipo_centro = 'industria' and new.quantidade > 0 then
      raise exception 'Mercadoria que entra no CD do Indústria precisa de endereço de armazenagem. Informe a posição antes de lançar.';
    end if;
    return new;
  end if;

  select centro_id, bloqueado into v_centro_do_end, v_bloqueado
    from public.estoque_enderecos where id = new.endereco_id;

  if v_centro_do_end is null then
    raise exception 'Endereço de armazenagem não encontrado.';
  end if;

  if v_centro_do_end <> new.centro_id then
    raise exception 'O endereço informado pertence a outro centro de distribuição.';
  end if;

  -- Saída de endereço bloqueado segue permitida: é assim que se esvazia uma
  -- posição avariada. O que não se faz é guardar mais lá.
  if v_bloqueado and new.quantidade > 0 then
    raise exception 'Este endereço está bloqueado e não pode receber mercadoria.';
  end if;

  return new;
end;
$$;

-- ============================================================
-- 3. Produto não é apontado ao CD do Indústria antes da separação existir
-- ============================================================
-- A trava vive no cadastro, e não no checkout, de propósito: é no cadastro que a
-- pessoa pode corrigir. Sem ela, o erro aparece na venda, que é onde ele custa
-- caro e onde ninguém entende o que fazer com a mensagem.
--
-- Isto sai quando o Milestone 3 do PRD 039 entregar recebimento e separação. Até
-- lá, custódia no CD é promessa comercial sem operação que a sustente.
create or replace function public.produto_centro_recusa_industria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo text;
begin
  select tipo into v_tipo
    from public.centros_distribuicao where id = new.centro_id;

  if v_tipo = 'industria' then
    raise exception 'Ainda não é possível apontar produto para o CD do Indústria: o recebimento e a separação (Milestone 3 do PRD 039) não existem. Use um centro da própria loja.';
  end if;

  return new;
end;
$$;

drop trigger if exists produto_centros_recusa_industria on public.produto_centros;
create trigger produto_centros_recusa_industria
  before insert or update of centro_id on public.produto_centros
  for each row execute function public.produto_centro_recusa_industria();

-- ============================================================
-- 4. Espelhamento de produto: sem centro deixa rastro, não silêncio
-- ============================================================
-- O fallback já existe e funciona (produto com dois centros cai no centro padrão
-- da loja, pelo coalesce de `estoque_centro_do_produto`), então o que muda aqui
-- é só o caso residual: loja sem centro padrão. O lançamento continua não
-- acontecendo, porque lançar sem centro é impossível, mas agora a paridade que
-- quebra tem onde ser investigada.
create or replace function public.estoque_espelhar_produto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta   int := new.estoque_atual - old.estoque_atual;
  v_centro  uuid;
  v_motivo  text := nullif(btrim(coalesce(current_setting('app.estoque_motivo', true), '')), '');
  v_origem  text;
  v_tipo    text;
begin
  if v_delta = 0 then
    return new;
  end if;

  v_centro := public.estoque_centro_do_produto(new.id);
  if v_centro is null then
    -- Sem centro não há lançamento possível. O que não pode é passar calado:
    -- daqui em diante a soma do ledger não fecha com estoque_atual e ninguém
    -- saberia por quê.
    insert into public.auditoria_eventos
      (ator_id, ator_papel, acao, tabela, registro_id, dados_antes, dados_depois)
    values (auth.uid(), 'sistema', 'estoque.sem_centro_resolvivel', 'produtos', new.id,
            jsonb_build_object('estoque_atual', old.estoque_atual),
            jsonb_build_object('estoque_atual', new.estoque_atual,
                               'delta', v_delta,
                               'pendencia', 'loja sem centro de distribuição padrão: movimento ficou fora do ledger'));
    return new;
  end if;

  if v_motivo is not null then
    v_origem := 'ajuste_seller';
    v_tipo   := 'ajuste';
  else
    v_origem := case when v_delta < 0 then 'checkout' else 'sistema' end;
    v_tipo   := case when v_delta < 0 then 'saida' else 'entrada' end;
    v_motivo := case when v_delta < 0
                     then 'Baixa automática pela criação de pedido'
                     else 'Reposição automática (cancelamento, estorno ou rotina de sistema)'
                end;
  end if;

  insert into public.estoque_movimentos
    (produto_id, centro_id, quantidade, tipo, origem, motivo, autor)
  values (new.id, v_centro, v_delta, v_tipo, v_origem, v_motivo, auth.uid());

  return new;
end;
$$;

-- ============================================================
-- 5. Espelhamento da venda futura
-- ============================================================
-- Mesmo desenho do espelhamento de produto: trigger sobre a coluna, e não
-- chamada no app. `vendas_futuras.estoque` é escrita por `checkout_criar_pedido`,
-- por `pedido_restaurar_estoque` e pelo cadastro do seller; colar o lançamento em
-- um desses caminhos deixaria os outros dois fora do extrato.
create or replace function public.estoque_espelhar_venda_futura()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta  int;
  v_centro uuid;
  v_motivo text;
  v_tipo   text;
  v_origem text;
begin
  if tg_op = 'INSERT' then
    v_delta  := coalesce(new.estoque, 0);
    v_motivo := 'Abertura de venda futura';
    v_origem := 'ajuste_seller';
  else
    v_delta  := coalesce(new.estoque, 0) - coalesce(old.estoque, 0);
    v_motivo := case when v_delta < 0
                     then 'Baixa de venda futura pela criação de pedido'
                     else 'Devolução de venda futura (cancelamento ou estorno)'
                end;
    v_origem := case when v_delta < 0 then 'checkout' else 'sistema' end;
  end if;

  if v_delta = 0 then
    return new;
  end if;

  v_centro := public.estoque_centro_do_produto(new.produto_id);
  if v_centro is null then
    return new; -- mesmo caso residual do bloco 4, e o rastro já é gravado lá
  end if;

  v_tipo := case when v_delta < 0 then 'saida' else 'entrada' end;

  insert into public.estoque_movimentos
    (produto_id, centro_id, quantidade, tipo, origem, motivo, autor, venda_futura_id)
  values (new.produto_id, v_centro, v_delta, v_tipo, v_origem, v_motivo, auth.uid(), new.id);

  return new;
end;
$$;

drop trigger if exists vendas_futuras_espelha_estoque on public.vendas_futuras;
create trigger vendas_futuras_espelha_estoque
  after insert or update of estoque on public.vendas_futuras
  for each row execute function public.estoque_espelhar_venda_futura();

-- ============================================================
-- 6. Saldo de abertura da venda futura que já existe
-- ============================================================
-- Sem isto o extrato nasce contando só o que se mover de hoje em diante, e as
-- 15.599 unidades já reservadas seguiriam sem origem. Um lançamento de abertura
-- por linha, com o saldo atual, no mesmo espírito do backfill da 0175.
insert into public.estoque_movimentos
  (produto_id, centro_id, quantidade, tipo, origem, motivo, venda_futura_id, criado_em)
select vf.produto_id,
       public.estoque_centro_do_produto(vf.produto_id),
       vf.estoque,
       'entrada',
       'migracao',
       'Saldo de abertura da venda futura (0179)',
       vf.id,
       vf.created_at
  from public.vendas_futuras vf
 where vf.estoque > 0
   and vf.produto_id is not null
   and public.estoque_centro_do_produto(vf.produto_id) is not null
   and not exists (
     select 1 from public.estoque_movimentos m where m.venda_futura_id = vf.id
   );
