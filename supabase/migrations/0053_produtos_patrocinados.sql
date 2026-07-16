-- 0053: sistema de publicidade — seller escolhe produtos a serem
-- patrocinados. Guarda só a INTENÇÃO do seller (orçamento/período); a
-- campanha real na Meta Ads (industria24horas@gmail.com) exige OAuth
-- explícito do usuário via MCP, não criada automaticamente aqui.
create table public.produtos_patrocinados (
  id                uuid primary key default gen_random_uuid(),
  produto_id        uuid not null references public.produtos (id) on delete cascade,
  loja_id           uuid not null references public.lojas (id) on delete cascade,
  orcamento_diario  numeric(10,2) not null check (orcamento_diario > 0),
  data_inicio       date not null,
  data_fim          date,
  status            text not null default 'Pendente' check (status in ('Pendente','Ativo','Pausado','Encerrado')),
  meta_campaign_id  text, -- preenchido só quando a campanha real é criada na Meta
  criado_em         timestamptz not null default now(),
  check (data_fim is null or data_fim >= data_inicio)
);
alter table public.produtos_patrocinados enable row level security;

create policy produtos_patrocinados_owner on public.produtos_patrocinados for all
  using (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.lojas l where l.id = loja_id and l.owner_id = auth.uid()));

create index produtos_patrocinados_loja_idx on public.produtos_patrocinados (loja_id);
create index produtos_patrocinados_produto_idx on public.produtos_patrocinados (produto_id);
