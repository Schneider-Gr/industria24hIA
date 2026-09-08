-- Segunda passada do backfill de cobertura: o produto que sobrou sem faixa
-- depois do 0166 (loja sem nenhuma cobertura declarada, logo sem moda para
-- herdar) recebe a faixa que contém o CEP de origem dele.
--
-- Premissa explícita: "entrega no próprio estado". Cobertura NÃO é origem — a
-- Cerâmica Iguatú fica em Rio Branco e entrega em Manaus — mas para loja que
-- nunca declarou nada é o default mais conservador que existe, e o seller
-- corrige no painel, onde a região agora é campo obrigatório.
--
-- Origem = `cep_produto`, e o CEP da loja quando o produto não tem o seu.
-- Entre faixas que contêm o mesmo CEP (as 3 antigas se sobrepõem às de UF do
-- 0165: Manaus 69000000-69099999 cabe dentro de Amazonas 69000000-69299999),
-- vence a mais estreita, que é a cobertura mais específica.

with origem as (
  select p.id,
         nullif(regexp_replace(coalesce(nullif(p.cep_produto, ''), l.cep, ''), '\D', '', 'g'), '') as cep
  from produtos p
  left join lojas l on l.id = p.loja_id
  where p.faixa_cep_id is null
),
valida as (
  select id, cep::bigint as cep
  from origem
  where cep ~ '^\d{8}$' and cep::bigint >= 1000000
),
escolha as (
  select distinct on (v.id) v.id, f.id as faixa_cep_id
  from valida v
  join faixas_cep f on v.cep between f.cep_inicial and f.cep_final
  order by v.id, (f.cep_final - f.cep_inicial) asc, f.id
)
update produtos p
set faixa_cep_id = escolha.faixa_cep_id
from escolha
where p.id = escolha.id;
