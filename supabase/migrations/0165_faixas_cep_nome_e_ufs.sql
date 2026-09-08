-- Faixas de CEP por UF, para o seller ter o que escolher em "Região de entrega".
-- Antes desta migration existiam 3 intervalos (Manaus, Acre, DF/GO), todos do
-- Norte: seller de qualquer outra UF não tinha opção e deixava sem restrição.
--
-- `ativo = false` nas linhas de UF é deliberado e é o que separa os dois usos
-- da tabela: cotar_frete_interno, coletiva_fechar e checkout_criar_pedido
-- filtram por `ativo`, então essas linhas nunca entram no cálculo de frete; a
-- cobertura (faixa-cep-produto.ts) lê pela FK produtos.faixa_cep_id e ignora
-- `ativo`. Assim ninguém passa a cobrar 10% em UF nova sem decidir isso.
--
-- Os intervalos são os oficiais dos Correios e NÃO são um por UF: AM, DF e GO
-- são descontínuos (RR fica dentro do 69, GO e DF se intercalam no 72/73).
-- Achatar em min-max cobriria CEP de vizinho, por isso cada trecho é uma linha.

alter table faixas_cep add column if not exists nome text;

comment on column faixas_cep.nome is
  'Rótulo legível da faixa, mostrado ao seller no cadastro do produto.';
comment on column faixas_cep.ativo is
  'true = participa da cotação de frete. Faixa de cobertura pura (UF) fica false.';

insert into faixas_cep (nome, cep_inicial, cep_final, ativo, percentual)
values
  ('São Paulo (SP)',          1000000, 19999999, false, 0),
  ('Rio de Janeiro (RJ)',    20000000, 28999999, false, 0),
  ('Espírito Santo (ES)',    29000000, 29999999, false, 0),
  ('Minas Gerais (MG)',      30000000, 39999999, false, 0),
  ('Bahia (BA)',             40000000, 48999999, false, 0),
  ('Sergipe (SE)',           49000000, 49999999, false, 0),
  ('Pernambuco (PE)',        50000000, 56999999, false, 0),
  ('Alagoas (AL)',           57000000, 57999999, false, 0),
  ('Paraíba (PB)',           58000000, 58999999, false, 0),
  ('Rio Grande do Norte (RN)', 59000000, 59999999, false, 0),
  ('Ceará (CE)',             60000000, 63999999, false, 0),
  ('Piauí (PI)',             64000000, 64999999, false, 0),
  ('Maranhão (MA)',          65000000, 65999999, false, 0),
  ('Pará (PA)',              66000000, 68899999, false, 0),
  ('Amapá (AP)',             68900000, 68999999, false, 0),
  ('Amazonas (AM)',          69000000, 69299999, false, 0),
  ('Roraima (RR)',           69300000, 69399999, false, 0),
  ('Amazonas (AM)',          69400000, 69899999, false, 0),
  ('Acre (AC)',              69900000, 69999999, false, 0),
  ('Distrito Federal (DF)',  70000000, 72799999, false, 0),
  ('Goiás (GO)',             72800000, 72999999, false, 0),
  ('Distrito Federal (DF)',  73000000, 73699999, false, 0),
  ('Goiás (GO)',             73700000, 76799999, false, 0),
  ('Tocantins (TO)',         77000000, 77999999, false, 0),
  ('Mato Grosso (MT)',       78000000, 78899999, false, 0),
  ('Rondônia (RO)',          78900000, 78999999, false, 0),
  ('Mato Grosso do Sul (MS)', 79000000, 79999999, false, 0),
  ('Paraná (PR)',            80000000, 87999999, false, 0),
  ('Santa Catarina (SC)',    88000000, 89999999, false, 0),
  ('Rio Grande do Sul (RS)', 90000000, 99999999, false, 0)
on conflict do nothing;

-- Nome das 3 faixas que já existiam (a do Acre é idêntica à faixa de UF, então
-- o insert acima não a duplicou e ela segue valendo para frete).
update faixas_cep set nome = 'Manaus e região (AM)'
  where cep_inicial = 69000000 and cep_final = 69099999 and nome is null;
update faixas_cep set nome = 'Acre (AC)'
  where cep_inicial = 69900000 and cep_final = 69999999 and nome is null;
update faixas_cep set nome = 'Distrito Federal e entorno (DF/GO)'
  where cep_inicial = 70000000 and cep_final = 73699999 and nome is null;
