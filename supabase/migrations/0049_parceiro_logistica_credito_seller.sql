-- 0046: schema DESENHADO DO ZERO para as seções "Parceiro logística" e
-- "Crédito" do seller (Bubble /version-test/seller tinha 0 linhas de dado —
-- schema de campo não era observável, então não foi copiado, foi projetado
-- a partir das colunas visíveis na UI e do padrão já usado no módulo seller
-- de 0002_seller_module.sql).

-- ============ Parceiro logística (solicitações de parceria/representação) ============
-- Colunas observadas na UI Bubble: Representante, Produto, Porcentagem, Status, Ações.
-- Distinto de public.afiliacoes (comissão de venda por produto): aqui é uma
-- solicitação de parceria comercial que o representante faz à loja, que o
-- seller aprova/recusa antes de virar afiliação ativa.
create table public.parcerias_representante (
  id                 uuid primary key default gen_random_uuid(),
  loja_id            uuid not null references public.lojas (id) on delete cascade,
  representante_id   uuid not null references auth.users (id) on delete cascade,
  produto_id         uuid references public.produtos (id) on delete set null,
  porcentagem        numeric(5,2) not null check (porcentagem >= 0 and porcentagem <= 100),
  status             text not null default 'Pendente' check (status in ('Pendente','Aprovada','Recusada','Cancelada')),
  criado_em          timestamptz not null default now()
);
alter table public.parcerias_representante enable row level security;

-- Representante cria/lê/cancela suas próprias solicitações
create policy parcerias_representante_self on public.parcerias_representante for all
  using (representante_id = auth.uid()) with check (representante_id = auth.uid());

-- Seller (dono da loja) lê e decide (aprova/recusa) parcerias da própria loja
create policy parcerias_representante_loja on public.parcerias_representante for all
  using (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()));

create index parcerias_representante_loja_idx on public.parcerias_representante (loja_id);
create index parcerias_representante_rep_idx on public.parcerias_representante (representante_id);

-- ============ Crédito (solicitação de crédito da empresa/loja) ============
-- Dado financeiro sensível: status só muda por admin (mesmo padrão de guard
-- usado em linha_itens.transferido / 0012_hardening_seguranca.sql).
create table public.solicitacoes_credito (
  id                uuid primary key default gen_random_uuid(),
  loja_id           uuid not null references public.lojas (id) on delete cascade,
  valor_solicitado  numeric(12,2) not null check (valor_solicitado > 0),
  finalidade        text,
  prazo_meses       integer check (prazo_meses > 0),
  status            text not null default 'Pendente' check (status in ('Pendente','Em análise','Aprovado','Recusada','Cancelada')),
  observacoes       text,
  criado_em         timestamptz not null default now(),
  respondido_em     timestamptz
);
alter table public.solicitacoes_credito enable row level security;

-- Sócios da empresa vinculados a uma solicitação (Bubble: socio_empresa_solicitacao_credito)
create table public.socios_solicitacao_credito (
  id               uuid primary key default gen_random_uuid(),
  solicitacao_id   uuid not null references public.solicitacoes_credito (id) on delete cascade,
  nome             text not null,
  cpf              text,
  percentual_participacao numeric(5,2) check (percentual_participacao >= 0 and percentual_participacao <= 100)
);
alter table public.socios_solicitacao_credito enable row level security;

-- Seller lê/cria/cancela solicitações da própria loja
create policy solicitacoes_credito_owner on public.solicitacoes_credito for all
  using (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()));

create policy socios_credito_owner on public.socios_solicitacao_credito for all
  using (exists (select 1 from public.solicitacoes_credito s join public.lojas l on l.id = s.loja_id
                 where s.id = solicitacao_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.solicitacoes_credito s join public.lojas l on l.id = s.loja_id
                 where s.id = solicitacao_id and l.owner_id = auth.uid()));

-- Guard financeiro: seller não pode se auto-aprovar crédito nem mudar status
-- de parceria fora do fluxo (só admin decide aprovação/recusa).
-- Dono pode cancelar a própria solicitação Pendente; qualquer outra
-- transição de status (aprovar/recusar) é exclusiva de admin.
create or replace function public.guard_status_financeiro_seller()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if public.is_admin() then
      return new;
    end if;
    if old.status = 'Pendente' and new.status in ('Cancelada','Recusada') then
      return new;
    end if;
    raise exception 'Apenas admin altera o status desta solicitação.';
  end if;
  return new;
end; $$;

create trigger guard_credito_status
  before update on public.solicitacoes_credito
  for each row execute function public.guard_status_financeiro_seller();

create trigger guard_parceria_status
  before update on public.parcerias_representante
  for each row execute function public.guard_status_financeiro_seller();

create index solicitacoes_credito_loja_idx on public.solicitacoes_credito (loja_id);
create index socios_credito_solicitacao_idx on public.socios_solicitacao_credito (solicitacao_id);
