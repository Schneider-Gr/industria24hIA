-- Correção de dado: 3 produtos da Viva Ecológica apontavam para a faixa do
-- Acre. O dono confirmou em 08/09/2026 que a loja atende SÓ Manaus/AM, e os
-- outros 23 produtos dela já usam a faixa de Manaus.
--
-- Por que a faixa e não o `loja_id`: os três têm `cep_produto` de Rio Branco
-- (69900004 e 69903012) e "Buriti" no nome, o que sugere importação do Bubble
-- com a loja trocada. Dois deles porém já têm venda (6 e 1 linha_itens), e
-- mudar o dono de um produto vendido reescreve a quem a venda pertenceu.
-- Origem em Rio Branco com cobertura em Manaus é o mesmo padrão da Cerâmica
-- Iguatú, então a combinação é coerente com o cadastro que já existe.
--
-- A faixa alvo é a mesma linha que os irmãos usam (a global de Manaus), não
-- uma faixa nova, para a loja continuar com cobertura única.

update produtos p
set faixa_cep_id = (
  select f.id from faixas_cep f
  where f.cep_inicial = 69000000 and f.cep_final = 69099999
    and f.loja_id is null and f.transportadora_id is null
  limit 1
)
from lojas l, faixas_cep atual
where l.id = p.loja_id
  and atual.id = p.faixa_cep_id
  and l.nome ilike '%viva ecologica%'
  and atual.cep_inicial = 69900000
  and atual.cep_final = 69999999;
