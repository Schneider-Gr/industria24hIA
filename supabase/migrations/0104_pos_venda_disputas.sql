-- 0104: Pós-venda / Disputas (PRD 009) + Termos de produtos perecíveis (PRD 010).
-- Disputa reaproveita conversas/mensagens (0075): uma disputa cria uma
-- conversa com pedido_id preenchido; o chat geral continua com pedido_id
-- null. Índice único de conversas precisa incluir pedido_id para não colidir
-- com o chat geral já existente sobre o mesmo comprador+loja+produto.

-- ============ PRD 010: produto perecível + termo ============
alter table public.produtos
  add column if not exists perecivel boolean not null default false;

alter table public.pedidos
  add column if not exists aceite_termos_pereciveis_em timestamptz,
  add column if not exists aceite_termos_pereciveis_versao text;

insert into public.paginas_cms (slug, titulo, conteudo_rich) values
(
  'termos-produtos-pereciveis',
  'Termos de Compra — Produtos Perecíveis',
  $TERMOS$TERMOS DE COMPRA — PRODUTOS PERECÍVEIS
Indústria 24h — última atualização: 05/08/2026

1. NATUREZA DO PRODUTO
1.1 Produtos identificados como perecíveis (ex.: hortifruti, alimentos em geral) têm validade curta e podem se deteriorar naturalmente com o tempo, mesmo quando armazenados e transportados corretamente.

2. RESPONSABILIDADE DE CONFERÊNCIA NO RECEBIMENTO
2.1 O comprador deve conferir o produto perecível NO ATO DO RECEBIMENTO. Problemas de qualidade, avaria ou divergência devem ser reportados dentro da janela de disputa reduzida aplicável a este tipo de produto (24 horas após a confirmação de entrega), com foto como evidência obrigatória.
2.2 Reclamações feitas após essa janela não serão aceitas, pois não é mais possível avaliar se o problema teve origem no transporte/produção ou na deterioração natural ocorrida após a entrega.

3. RESPONSABILIDADE DA LOJA
3.1 A loja garante as condições adequadas de transporte e armazenamento até o momento da entrega confirmada.
3.2 A loja fica isenta de responsabilidade por deterioração ocorrida após a entrega confirmada, desde que o comprador tenha tido a oportunidade de conferir o produto no ato do recebimento.

4. ACEITE
4.1 Ao finalizar uma compra que contenha item perecível, o comprador declara estar ciente e de acordo com estes Termos.$TERMOS$
)
on conflict (slug) do update
  set titulo = excluded.titulo,
      conteudo_rich = excluded.conteudo_rich,
      atualizado_em = now();

-- ============ PRD 009: disputas ============
alter table public.conversas
  add column if not exists pedido_id uuid references public.pedidos (id) on delete set null;

drop index if exists conversas_unicidade;
create unique index if not exists conversas_unicidade
  on public.conversas (comprador_id, loja_id, produto_id, pedido_id) nulls not distinct;

create table if not exists public.disputas (
  id                   uuid primary key default gen_random_uuid(),
  pedido_id            uuid not null references public.pedidos (id) on delete cascade,
  linha_item_id        uuid references public.linha_itens (id) on delete set null,
  comprador_id         uuid not null references auth.users (id) on delete cascade,
  loja_id              uuid not null references public.lojas (id) on delete cascade,
  conversa_id          uuid not null references public.conversas (id) on delete cascade,
  motivo               text not null check (motivo in (
                          'produto_avariado', 'produto_diferente_anunciado',
                          'produto_nao_entregue', 'quantidade_incorreta',
                          'produto_estragado_ou_vencido', 'outro'
                        )),
  descricao            text not null check (length(btrim(descricao)) between 1 and 2000),
  status               text not null default 'aberta' check (status in (
                          'aberta', 'em_atendimento_loja', 'aguardando_confirmacao_comprador',
                          'resolvida_pela_loja', 'em_mediacao_admin', 'resolvida'
                        )),
  aberta_em            timestamptz not null default now(),
  sla_loja_vence_em    timestamptz not null,
  resolvida_em         timestamptz,
  escalada_em          timestamptz,
  decisao              text check (decisao in ('reembolso_total', 'reembolso_parcial', 'troca', 'negada')),
  decisao_valor        numeric(12,2),
  decisao_justificativa text,
  decidida_em          timestamptz,
  decidida_por         uuid references auth.users (id)
);

create index if not exists disputas_pedido_idx on public.disputas (pedido_id);
create index if not exists disputas_loja_idx on public.disputas (loja_id, status);
create index if not exists disputas_comprador_idx on public.disputas (comprador_id);

-- Uma disputa aberta por linha de item (US01 rule: máx. 1 disputa ativa por item).
create unique index if not exists disputas_linha_item_ativa_unica
  on public.disputas (linha_item_id)
  where status not in ('resolvida_pela_loja', 'resolvida');

create table if not exists public.disputa_fotos (
  id          uuid primary key default gen_random_uuid(),
  disputa_id  uuid not null references public.disputas (id) on delete cascade,
  url         text not null,
  enviado_por uuid not null references auth.users (id),
  criado_em   timestamptz not null default now()
);

create index if not exists disputa_fotos_disputa_idx on public.disputa_fotos (disputa_id);

alter table public.disputas enable row level security;
alter table public.disputa_fotos enable row level security;

-- Participante = comprador da disputa OU dono da loja da disputa.
create or replace function public.eh_participante_disputa(p_disputa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.disputas d
    left join public.lojas l on l.id = d.loja_id
    where d.id = p_disputa_id
      and (d.comprador_id = auth.uid() or l.owner_id = auth.uid())
  );
$$;

create policy disputas_comprador_read on public.disputas for select
  using (comprador_id = auth.uid());
create policy disputas_comprador_insert on public.disputas for insert
  with check (comprador_id = auth.uid());
create policy disputas_seller_read on public.disputas for select
  using (exists (
    select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()
  ));
-- Update de status: comprador escala (em_mediacao_admin) ou confirma
-- resolução; loja só move para em_atendimento_loja/resolvida_pela_loja.
-- A decisão final (resolvida + campos de decisão) é bloqueada para
-- não-admin pelo guard_campos_restritos() abaixo.
create policy disputas_comprador_update on public.disputas for update
  using (comprador_id = auth.uid())
  with check (comprador_id = auth.uid());
create policy disputas_seller_update on public.disputas for update
  using (exists (
    select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()
  ));
create policy disputas_admin_all on public.disputas for all
  using (public.is_admin()) with check (public.is_admin());

create policy disputa_fotos_participante_read on public.disputa_fotos for select
  using (public.eh_participante_disputa(disputa_id));
create policy disputa_fotos_participante_insert on public.disputa_fotos for insert
  with check (enviado_por = auth.uid() and public.eh_participante_disputa(disputa_id));
create policy disputa_fotos_admin_all on public.disputa_fotos for all
  using (public.is_admin()) with check (public.is_admin());

-- Bucket de anexos de disputa: upload restrito a participantes, leitura
-- restrita a participantes + admin (diferente de 'entregas', que é público —
-- foto de disputa pode conter evidência sensível do comprador).
insert into storage.buckets (id, name, public)
values ('disputas', 'disputas', false)
on conflict (id) do nothing;

create policy disputas_bucket_upload_participante on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'disputas'
    and public.eh_participante_disputa(((storage.foldername(name))[1])::uuid)
  );

create policy disputas_bucket_read_participante on storage.objects
  for select to authenticated
  using (
    bucket_id = 'disputas'
    and (
      public.eh_participante_disputa(((storage.foldername(name))[1])::uuid)
      or public.is_admin()
    )
  );

-- Extensão do trigger de hardening (0012): só admin decide o desfecho final
-- da disputa (campos de decisão + status 'resolvida').
create or replace function public.guard_campos_restritos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_table_name = 'produtos' then
    if tg_op = 'INSERT' then
      if new.status_produto is distinct from 'Pendente' then
        raise exception 'Produto novo nasce Pendente; aprovação é do admin.';
      end if;
    elsif new.status_produto is distinct from old.status_produto then
      raise exception 'Apenas admin altera status_produto (moderação).';
    end if;

  elsif tg_table_name = 'lojas' then
    if tg_op = 'UPDATE' and new.situacao is distinct from old.situacao then
      raise exception 'Apenas admin altera a situação da loja (moderação).';
    end if;

  elsif tg_table_name = 'pedidos' then
    if tg_op = 'UPDATE' and (
         new.valor_pedido is distinct from old.valor_pedido
      or new.repasse_ind24 is distinct from old.repasse_ind24
      or new.valor_recebido_industria is distinct from old.valor_recebido_industria
      or new.asaas_cobranca_id is distinct from old.asaas_cobranca_id
      or new.link_cobranca is distinct from old.link_cobranca
      or new.dt_pagamento is distinct from old.dt_pagamento
    ) then
      raise exception 'Apenas admin altera campos financeiros do pedido.';
    end if;

  elsif tg_table_name = 'linha_itens' then
    if tg_op = 'UPDATE' and (
         new.valor is distinct from old.valor
      or new.pago is distinct from old.pago
      or new.transferido is distinct from old.transferido
      or new.repasse_ind is distinct from old.repasse_ind
      or new.repasse_afiliado is distinct from old.repasse_afiliado
      or new.repasse_vendedor is distinct from old.repasse_vendedor
      or new.dt_pagamento_cliente is distinct from old.dt_pagamento_cliente
    ) then
      raise exception 'Apenas admin altera campos financeiros do item.';
    end if;

  elsif tg_table_name = 'disputas' then
    if tg_op = 'UPDATE' and (
         new.status = 'resolvida'
      or new.decisao is distinct from old.decisao
      or new.decisao_valor is distinct from old.decisao_valor
      or new.decisao_justificativa is distinct from old.decisao_justificativa
      or new.decidida_em is distinct from old.decidida_em
      or new.decidida_por is distinct from old.decidida_por
    ) then
      raise exception 'Apenas admin decide o desfecho final da disputa.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_disputas_decisao on public.disputas;
create trigger guard_disputas_decisao
  before update on public.disputas
  for each row execute function public.guard_campos_restritos();

-- Realtime nas disputas (para o admin ver escalonamento sem refresh).
do $$
begin
  alter publication supabase_realtime add table public.disputas;
exception when duplicate_object then null;
end;
$$;
