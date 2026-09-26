-- 0202: tabela de travessias (balsas e portos) para o simulador do avião (#804,
-- change OpenSpec simulador-aviao-bandas-regioes-travessia).
--
-- Quando a rota do Google tem trecho de barco (manobra FERRY), o simulador tira
-- esse trecho do km cobrado e soma a balsa só de ida: valor por veículo
-- equivalente × fator do veículo (moto, carro = pickup, caminhão). A ANTAQ não
-- publica as tarifas em arquivo importável; a plataforma mantém esta tabela a
-- partir dos documentos oficiais, com fonte e data visíveis ao seller.
--
-- fatores_oficiais = false: fatores estimados (o anexo de equivalência do
-- edital da Chamada Pública 1/2026 exige login); o seller vê "estimativa,
-- confirme com o operador" e pode editar o valor na simulação.

create table if not exists public.travessias (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  operador          text,
  valor_equivalente numeric(12,2) not null check (valor_equivalente > 0),
  fator_moto        numeric(6,2) check (fator_moto > 0),
  fator_carro       numeric(6,2) check (fator_carro > 0),
  fator_caminhao    numeric(6,2) check (fator_caminhao > 0),
  fatores_oficiais  boolean not null default false,
  fonte_url         text,
  fonte_descricao   text,
  vigente_desde     date,
  ativo             boolean not null default true,
  atualizado_em     timestamptz not null default now()
);

alter table public.travessias enable row level security;

-- Leitura para quem está logado (o simulador roda no painel do seller);
-- escrita só do admin.
drop policy if exists travessias_read on public.travessias;
create policy travessias_read on public.travessias
  for select to authenticated using (true);

drop policy if exists travessias_admin on public.travessias;
create policy travessias_admin on public.travessias
  for all using (public.is_admin()) with check (public.is_admin());

-- Carga inicial (fontes consultadas em 25/09/2026).
insert into public.travessias
  (nome, operador, valor_equivalente, fator_moto, fator_carro, fator_caminhao, fatores_oficiais, fonte_url, fonte_descricao, vigente_desde)
select * from (values
  ('Balsa Manaus (Ceasa) ↔ Careiro da Várzea (BR-319)', 'J Cruz', 30.67::numeric, 0.5::numeric, 1.5::numeric, 3::numeric, false,
   'https://www.gov.br/antaq/pt-br/noticias/2026/antaq-realiza-abertura-do-envelope-da-chamada-publica-para-a-travessia-entre-manaus-e-careiro-da-varzea',
   'ANTAQ, Chamada Pública 1/2026: R$ 30,67 por veículo equivalente. Fatores estimados pela proporção da tabela de 2023.', date '2026-08-28'),
  ('Acesso ao Porto de Manaus', 'Porto de Manaus', 60::numeric, null, 1.2::numeric, null, false,
   'https://amazonasatual.com.br/acesso-ao-porto-de-manaus-custa-mais-que-travessia-de-balsa-ao-careiro/',
   'Operador (notícia de 22/09/2025): carro R$ 60, pickup R$ 72. Moto e caminhão sem valor publicado.', date '2025-06-01')
) as v(nome, operador, valor_equivalente, fator_moto, fator_carro, fator_caminhao, fatores_oficiais, fonte_url, fonte_descricao, vigente_desde)
where not exists (select 1 from public.travessias t where t.nome = v.nome);
