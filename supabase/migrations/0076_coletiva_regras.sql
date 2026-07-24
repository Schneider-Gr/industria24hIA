-- 0076: o SELLER passa a configurar a compra coletiva (MPDD-36 v2).
--
-- Até aqui a mecânica era 100% derivada: a RPC coletiva_criar (0069/0070)
-- pegava a 1ª faixa de promocoes_progressivas com desconto real e virava
-- meta; não havia limite de participantes, prazo configurável nem lotes
-- progressivos dentro da coletiva. Agora cada produto pode ter uma REGRA
-- própria, escrita pelo dono da loja.
--
-- Decisões do dono (24/07/2026):
--   * a coletiva fica aberta até o prazo, descendo de lote conforme entra
--     volume — todos pagam o MELHOR preço atingido (ciclo de vida na 0077);
--   * mínimo de participantes existe (uma "coletiva" de um comprador só não
--     é coletiva); máximo é opcional (null = sem teto);
--   * frete conjunto é opção da regra (v1 do módulo era só retirada).
--
-- `lotes` usa o MESMO shape de promocoes_progressivas.faixas
-- ([{min_qtd, valor_unitario, validade?}]) de propósito: a escolha do preço
-- reusa preco_faixa()/precoFaixa() em vez de inventar uma segunda regra.

-- ============ 1. Regra por produto ============
create table if not exists public.coletiva_regras (
  id                uuid primary key default gen_random_uuid(),
  produto_id        uuid not null unique references public.produtos (id) on delete cascade,
  ativo             boolean not null default true,
  meta_qtd          int check (meta_qtd is null or meta_qtd > 0),
  min_participantes int not null default 2 check (min_participantes >= 2),
  max_participantes int check (max_participantes is null or max_participantes >= 2),
  prazo_dias        int not null default 7 check (prazo_dias between 1 and 30),
  lotes             jsonb not null default '[]'::jsonb,
  frete_conjunto    boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint coletiva_regras_participantes_coerentes
    check (max_participantes is null or max_participantes >= min_participantes)
);

-- ============ 2. Validação dos lotes (trigger) ============
-- CHECK não consegue olhar produtos.valor nem varrer o array; o trigger é o
-- lugar honesto pra isso. Mesmas garantias que a 0070 aplicava só na criação
-- da coletiva, agora na ESCRITA da regra: desconto real e curva decrescente.
create or replace function public.coletiva_regras_validar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base numeric(12,2);
  v_prev_qtd int := 0;
  v_prev_valor numeric(12,2);
  v_lote record;
  v_n int;
begin
  select valor into v_base from produtos where id = new.produto_id;
  if v_base is null or v_base <= 0 then
    raise exception 'Produto sem preço base — defina o preço antes de configurar a coletiva.';
  end if;

  select count(*) into v_n from jsonb_array_elements(new.lotes);
  if new.ativo and v_n = 0 then
    raise exception 'Configure ao menos um lote de desconto para ativar a coletiva.';
  end if;
  if v_n > 4 then
    raise exception 'No máximo 4 lotes por produto (recebidos %).', v_n;
  end if;

  for v_lote in
    select (elem->>'min_qtd')::int as min_qtd,
           (elem->>'valor_unitario')::numeric as valor_unitario,
           ord
    from jsonb_array_elements(new.lotes) with ordinality as t(elem, ord)
    order by ord
  loop
    if v_lote.min_qtd is null or v_lote.min_qtd < 1 then
      raise exception 'Lote com quantidade mínima inválida.';
    end if;
    if v_lote.valor_unitario is null or v_lote.valor_unitario <= 0 then
      raise exception 'Lote com valor unitário inválido.';
    end if;
    if v_lote.valor_unitario >= v_base then
      raise exception 'Lote de % un (R$ %) não dá desconto sobre o preço base (R$ %).',
        v_lote.min_qtd, v_lote.valor_unitario, v_base;
    end if;
    if v_lote.ord > 1 then
      if v_lote.min_qtd <= v_prev_qtd then
        raise exception 'Lotes devem estar em ordem crescente de quantidade (% depois de %).',
          v_lote.min_qtd, v_prev_qtd;
      end if;
      if v_lote.valor_unitario >= v_prev_valor then
        raise exception 'Cada lote precisa ser mais barato que o anterior (R$ % depois de R$ %).',
          v_lote.valor_unitario, v_prev_valor;
      end if;
    end if;
    v_prev_qtd := v_lote.min_qtd;
    v_prev_valor := v_lote.valor_unitario;
  end loop;

  -- Meta explícita: precisa ser alcançável e coerente com o 1º lote.
  if new.meta_qtd is not null and v_n > 0 then
    if new.meta_qtd < (select min((elem->>'min_qtd')::int) from jsonb_array_elements(new.lotes) elem) then
      raise exception 'A meta não pode ser menor que o primeiro lote de desconto.';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists coletiva_regras_validar_trg on public.coletiva_regras;
create trigger coletiva_regras_validar_trg
  before insert or update on public.coletiva_regras
  for each row execute function public.coletiva_regras_validar();

-- ============ 3. RLS ============
-- Leitura pública: a vitrine anuncia a curva de preço na página do produto.
-- Escrita: dono da loja do produto (ou admin).
alter table public.coletiva_regras enable row level security;

drop policy if exists coletiva_regras_public_read on public.coletiva_regras;
create policy coletiva_regras_public_read on public.coletiva_regras
  for select using (true);

drop policy if exists coletiva_regras_dono_write on public.coletiva_regras;
create policy coletiva_regras_dono_write on public.coletiva_regras
  for all
  using (
    public.is_admin()
    or exists (
      select 1 from public.produtos p
      join public.lojas l on l.id = p.loja_id
      where p.id = coletiva_regras.produto_id and l.owner_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.produtos p
      join public.lojas l on l.id = p.loja_id
      where p.id = coletiva_regras.produto_id and l.owner_id = auth.uid()
    )
  );

-- ============ 4. Snapshot da regra na coletiva ============
-- A coletiva não pode mudar de regra no meio do jogo: o que valia quando ela
-- nasceu é o que fecha o preço. Coletivas antigas ficam com lotes = [] e o
-- comportamento idêntico ao de hoje (preço travado em valor_unitario).
alter table public.compras_coletivas
  add column if not exists regra_id uuid references public.coletiva_regras (id) on delete set null,
  add column if not exists lotes jsonb not null default '[]'::jsonb,
  add column if not exists min_participantes int not null default 1,
  add column if not exists max_participantes int,
  add column if not exists frete_conjunto boolean not null default false,
  add column if not exists fechada_em timestamptz;
