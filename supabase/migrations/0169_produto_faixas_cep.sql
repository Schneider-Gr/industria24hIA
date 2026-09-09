-- Cobertura de entrega N:N: o produto passa a declarar MAIS DE UMA região.
-- Decisão do dono em 08/09/2026. A FK única `produtos.faixa_cep_id` (0164) não
-- comporta o caso real: uma loja pode entregar em Manaus e no Acre, e o
-- produto pode sair de mais de um centro de distribuição.
--
-- A cobertura fica independente do CD de propósito. `produto_centros` já é
-- N:N e `linha_itens.centro_id` já registra de onde o item saiu, mas
-- `centros_distribuicao` não tem CEP: `localizacao` é texto livre em dois
-- formatos (JSON do Google em três registros, texto puro no quarto) e um dos
-- quatro aponta para Nova York. Derivar região daí inventaria dado. O CD
-- continua sendo o local de coleta; a cobertura é declaração do seller.
--
-- `faixa_cep_id` fica onde está por enquanto: as RPCs e o cadastro ainda a
-- leem, e removê-la é outra mudança. Esta migration só cria a tabela e copia
-- o que já existe, então é reversível sem perda.

create table if not exists produto_faixas_cep (
  produto_id uuid not null references produtos(id) on delete cascade,
  faixa_cep_id uuid not null references faixas_cep(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (produto_id, faixa_cep_id)
);

create index if not exists produto_faixas_cep_faixa_idx
  on produto_faixas_cep(faixa_cep_id);

comment on table produto_faixas_cep is
  'Regiões de entrega declaradas para o produto. Substitui produtos.faixa_cep_id, que vira legado.';

-- Cada produto que já tem faixa entra com a dele.
insert into produto_faixas_cep (produto_id, faixa_cep_id)
select id, faixa_cep_id from produtos where faixa_cep_id is not null
on conflict do nothing;

alter table produto_faixas_cep enable row level security;

-- Mesma leitura pública de faixas_cep: a vitrine precisa saber a cobertura
-- para decidir o que exibir.
create policy produto_faixas_cep_read on produto_faixas_cep
  for select using (true);

-- Escrita só de quem já pode editar o produto: dono da loja e admin, o mesmo
-- par de regras que produtos usa.
create policy produto_faixas_cep_owner_all on produto_faixas_cep
  for all using (
    exists (
      select 1 from produtos p join lojas l on l.id = p.loja_id
      where p.id = produto_faixas_cep.produto_id and l.owner_id = auth.uid()
    )
  );

create policy produto_faixas_cep_admin_all on produto_faixas_cep
  for all using (is_admin());
