-- 0039: módulo Parceiro Logístico — schema base (PRDs 02/03/04 + MPDD-43).
-- Três camadas: (1) mobilidade urbana on-demand (corridas avulsas tipo Uber
-- Frete, primeiro-a-aceitar ou leilão reverso de frete), (2) roteirização
-- automática de pedidos pagos (rotas atribuídas a afiliado logístico), e
-- (3) leilão reverso entre fabricantes (comprador publica volume, lojas dão
-- lances). RLS deny-by-default; escrita sensível só por RPC (0040).

-- ============ Parceiros (motorista/transportadora) ============
create table public.parceiros_logisticos (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references auth.users (id) on delete cascade,
  tipo           text not null check (tipo in ('motorista', 'transportadora')),
  nome           text not null,
  telefone       text,
  cnh            text,
  doc_veiculo    text,
  placa          text,
  capacidade_kg  numeric(10,2),
  capacidade_m3  numeric(10,2),
  area_atuacao   text, -- descrição livre + CEPs (v1); estruturar se precisar
  cep_base       text,
  valor_minimo_entrega numeric(12,2), -- paridade Bubble (Configurações do transportador)
  status         text not null default 'Pendente' check (status in ('Pendente', 'Aprovado', 'Suspenso')),
  nota_media     numeric(3,2),
  criado_em      timestamptz not null default now()
);
alter table public.parceiros_logisticos enable row level security;

create policy parceiros_self_all on public.parceiros_logisticos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy parceiros_admin_all on public.parceiros_logisticos
  for all using (public.is_admin()) with check (public.is_admin());
-- perfil público mínimo (nome/tipo/nota) p/ solicitante ver quem aceitou:
create view public.parceiros_publicos as
  select id, tipo, nome, nota_media, capacidade_kg, capacidade_m3
  from public.parceiros_logisticos where status = 'Aprovado';
grant select on public.parceiros_publicos to authenticated;

-- status só muda por admin (moderação) — guard simples por trigger
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
  return new;
end; $$;
create trigger guard_parceiro_status
  before insert or update on public.parceiros_logisticos
  for each row execute function public.guard_parceiro_status();

-- ============ Corridas (mobilidade urbana on-demand) ============
create table public.corridas (
  id               uuid primary key default gen_random_uuid(),
  solicitante_id   uuid not null references auth.users (id),
  pedido_id        uuid references public.pedidos (id),
  origem_cep       text not null,
  origem_endereco  text not null,
  destino_cep      text not null,
  destino_endereco text not null,
  peso_kg          numeric(10,2) not null check (peso_kg > 0),
  volume_m3        numeric(10,2),
  descricao_carga  text,
  janela_inicio    timestamptz not null,
  janela_fim       timestamptz not null check (janela_fim > janela_inicio),
  urgencia         text not null default 'normal' check (urgencia in ('normal', 'urgente')),
  modo             text not null default 'primeiro_aceita' check (modo in ('primeiro_aceita', 'leilao')),
  preco_sugerido   numeric(12,2),
  preco_final      numeric(12,2),
  status           text not null default 'Publicada'
                   check (status in ('Publicada', 'Aceita', 'Coletada', 'EmTransito', 'Entregue', 'Cancelada')),
  parceiro_id      uuid references public.parceiros_logisticos (id),
  foto_entrega_url text,
  assinatura_url   text,
  criado_em        timestamptz not null default now()
);
alter table public.corridas enable row level security;

create policy corridas_solicitante_read on public.corridas
  for select using (solicitante_id = auth.uid());
-- parceiro Aprovado vê corridas publicadas (feed) e as suas:
create policy corridas_parceiro_read on public.corridas
  for select using (
    exists (select 1 from parceiros_logisticos p
            where p.user_id = auth.uid() and p.status = 'Aprovado'
              and (corridas.status = 'Publicada' or corridas.parceiro_id = p.id))
  );
create policy corridas_admin_all on public.corridas
  for all using (public.is_admin()) with check (public.is_admin());
-- INSERT/UPDATE só por RPC (security definer bypassa RLS) — sem policy de escrita.

create index corridas_feed_idx on public.corridas (status, janela_inicio);

-- ============ Lances de frete (leilão reverso da corrida) ============
create table public.corrida_lances (
  id          uuid primary key default gen_random_uuid(),
  corrida_id  uuid not null references public.corridas (id) on delete cascade,
  parceiro_id uuid not null references public.parceiros_logisticos (id),
  valor       numeric(12,2) not null check (valor > 0),
  prazo       text,
  criado_em   timestamptz not null default now(),
  unique (corrida_id, parceiro_id)
);
alter table public.corrida_lances enable row level security;
create policy corrida_lances_solicitante_read on public.corrida_lances
  for select using (exists (select 1 from corridas c where c.id = corrida_id and c.solicitante_id = auth.uid()));
create policy corrida_lances_parceiro_read on public.corrida_lances
  for select using (exists (select 1 from parceiros_logisticos p where p.id = parceiro_id and p.user_id = auth.uid()));
create policy corrida_lances_admin_all on public.corrida_lances
  for all using (public.is_admin()) with check (public.is_admin());

-- ============ Posições GPS da corrida ============
create table public.corrida_posicoes (
  id         bigint generated always as identity primary key,
  corrida_id uuid not null references public.corridas (id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  criado_em  timestamptz not null default now()
);
alter table public.corrida_posicoes enable row level security;
-- parceiro da corrida insere; solicitante e parceiro leem:
create policy corrida_posicoes_insert on public.corrida_posicoes
  for insert with check (
    exists (select 1 from corridas c join parceiros_logisticos p on p.id = c.parceiro_id
            where c.id = corrida_id and p.user_id = auth.uid()
              and c.status in ('Coletada', 'EmTransito'))
  );
create policy corrida_posicoes_read on public.corrida_posicoes
  for select using (
    exists (select 1 from corridas c
            left join parceiros_logisticos p on p.id = c.parceiro_id
            where c.id = corrida_id and (c.solicitante_id = auth.uid() or p.user_id = auth.uid()))
  );
create index corrida_posicoes_corrida_idx on public.corrida_posicoes (corrida_id, criado_em desc);

-- ============ Avaliações ============
create table public.corrida_avaliacoes (
  corrida_id   uuid primary key references public.corridas (id) on delete cascade,
  avaliador_id uuid not null references auth.users (id),
  nota         int not null check (nota between 1 and 5),
  comentario   text,
  criado_em    timestamptz not null default now()
);
alter table public.corrida_avaliacoes enable row level security;
create policy corrida_avaliacoes_solicitante on public.corrida_avaliacoes
  for insert with check (
    avaliador_id = auth.uid()
    and exists (select 1 from corridas c where c.id = corrida_id
                and c.solicitante_id = auth.uid() and c.status = 'Entregue')
  );
create policy corrida_avaliacoes_read on public.corrida_avaliacoes
  for select using (true);

create or replace function public.atualizar_nota_parceiro()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update parceiros_logisticos pl
     set nota_media = (
       select round(avg(a.nota)::numeric, 2)
       from corrida_avaliacoes a join corridas c on c.id = a.corrida_id
       where c.parceiro_id = pl.id)
   where pl.id = (select parceiro_id from corridas where id = new.corrida_id);
  return new;
end; $$;
create trigger corrida_avaliacoes_nota
  after insert on public.corrida_avaliacoes
  for each row execute function public.atualizar_nota_parceiro();

-- ============ Rotas (roteirização automática de pedidos) ============
create table public.rotas (
  id                  uuid primary key default gen_random_uuid(),
  pedido_id           uuid not null unique references public.pedidos (id) on delete cascade,
  origem_cep          text,
  destino_cep         text,
  distancia_m         int,
  duracao_s           int,
  link_mapa           text,
  frete_calculado     numeric(12,2),
  parceiro_id         uuid references public.parceiros_logisticos (id),
  afiliado_id         uuid references auth.users (id), -- afiliado logístico (MPDD-21)
  status              text not null default 'Atribuida' check (status in ('Atribuida', 'EmTransito', 'Entregue')),
  whatsapp_enviado_em timestamptz,
  criado_em           timestamptz not null default now()
);
alter table public.rotas enable row level security;
create policy rotas_admin_all on public.rotas
  for all using (public.is_admin()) with check (public.is_admin());
create policy rotas_afiliado_read on public.rotas
  for select using (afiliado_id = auth.uid()
    or exists (select 1 from parceiros_logisticos p where p.id = rotas.parceiro_id and p.user_id = auth.uid()));
create policy rotas_afiliado_update on public.rotas
  for update using (afiliado_id = auth.uid()
    or exists (select 1 from parceiros_logisticos p where p.id = rotas.parceiro_id and p.user_id = auth.uid()));
create policy rotas_cliente_read on public.rotas
  for select using (exists (select 1 from pedidos pe where pe.id = rotas.pedido_id and pe.cliente_id = auth.uid()));

-- ============ Tabela de frete origem×destino ============
create table public.frete_tabela (
  id                    uuid primary key default gen_random_uuid(),
  origem_cep_inicial    int not null,
  origem_cep_final      int not null,
  destino_cep_inicial   int not null,
  destino_cep_final     int not null,
  preco_base            numeric(12,2) not null,
  preco_por_kg          numeric(12,4) not null default 0,
  multiplicador_urgente numeric(4,2) not null default 1.5,
  ativo                 boolean not null default true,
  criado_em             timestamptz not null default now(),
  check (origem_cep_final >= origem_cep_inicial),
  check (destino_cep_final >= destino_cep_inicial)
);
alter table public.frete_tabela enable row level security;
create policy frete_tabela_read on public.frete_tabela for select using (ativo);
create policy frete_tabela_admin_all on public.frete_tabela
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed: cobre as áreas das faixas_cep atuais como destino a partir de qualquer origem,
-- com preço base simbólico a calibrar pelo admin (v1; substitui o 10% quando houver faixa).
insert into public.frete_tabela (origem_cep_inicial, origem_cep_final, destino_cep_inicial, destino_cep_final, preco_base, preco_por_kg)
select 0, 99999999, cep_inicial, cep_final, 25.00, 0.15 from public.faixas_cep where ativo;

-- ============ Leilão reverso entre fabricantes ============
create table public.leiloes_fabricantes (
  id             uuid primary key default gen_random_uuid(),
  comprador_id   uuid not null references auth.users (id),
  categoria_id   uuid references public.categorias (id),
  titulo         text not null,
  descricao      text not null,
  volume         text not null,
  prazo_desejado date,
  janela_fim     timestamptz not null,
  status         text not null default 'Aberto' check (status in ('Aberto', 'Encerrado', 'Adjudicado', 'Cancelado')),
  lance_vencedor uuid,
  criado_em      timestamptz not null default now()
);
alter table public.leiloes_fabricantes enable row level security;
create policy leiloes_comprador_all on public.leiloes_fabricantes
  for all using (comprador_id = auth.uid()) with check (comprador_id = auth.uid());
-- lojas Ativas veem leilões abertos (da sua categoria ou sem categoria):
create policy leiloes_seller_read on public.leiloes_fabricantes
  for select using (
    exists (select 1 from lojas l where l.owner_id = auth.uid() and l.situacao = 'Ativa')
  );
create policy leiloes_admin_all on public.leiloes_fabricantes
  for all using (public.is_admin()) with check (public.is_admin());

create table public.leilao_lances (
  id         uuid primary key default gen_random_uuid(),
  leilao_id  uuid not null references public.leiloes_fabricantes (id) on delete cascade,
  loja_id    uuid not null references public.lojas (id),
  preco      numeric(12,2) not null check (preco > 0),
  prazo      text not null,
  condicoes  text,
  criado_em  timestamptz not null default now(),
  unique (leilao_id, loja_id)
);
alter table public.leilao_lances enable row level security;
create policy leilao_lances_comprador_read on public.leilao_lances
  for select using (exists (select 1 from leiloes_fabricantes lf where lf.id = leilao_id and lf.comprador_id = auth.uid()));
create policy leilao_lances_loja_all on public.leilao_lances
  for all using (exists (select 1 from lojas l where l.id = loja_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from lojas l where l.id = loja_id and l.owner_id = auth.uid()));
create policy leilao_lances_admin_all on public.leilao_lances
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.leiloes_fabricantes
  add constraint leiloes_lance_vencedor_fkey foreign key (lance_vencedor) references public.leilao_lances (id);
