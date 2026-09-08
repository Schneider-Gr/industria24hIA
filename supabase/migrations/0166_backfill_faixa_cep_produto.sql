-- Backfill da cobertura de entrega: produto sem faixa herda a faixa que a
-- própria loja já usa nos irmãos.
--
-- Estado antes (prod, 08/09/2026): 206 produtos, 154 sem faixa_cep_id. Dos 69
-- aprovados sem faixa, 46 são de 4 lojas reais que já declararam cobertura em
-- outros produtos; os outros 23 são de lojas de teste (construção, Loja Teste
-- Tour QA, sem nome), que não têm faixa nenhuma e por isso não são tocadas
-- aqui — elas saem no despublish das contas de teste.
--
-- A herança é pela MODA da loja, não pelo CEP da loja: faixa é declaração de
-- onde o seller entrega, não onde ele está. Cerâmica Iguatú fica em Rio Branco
-- e seus produtos com faixa apontam para Manaus; Viva Ecológica fica em Manaus
-- e tem 3 produtos no Acre. Derivar por geografia daria cobertura errada.
--
-- Por isso a moda só é aplicada quando é inequívoca: loja com empate entre
-- duas faixas fica de fora e vai para revisão manual do seller no painel.
-- Produto recusado também fica de fora.

with contagem as (
  select loja_id, faixa_cep_id, count(*) as n
  from produtos
  where faixa_cep_id is not null and loja_id is not null
  group by loja_id, faixa_cep_id
),
moda as (
  select loja_id, faixa_cep_id
  from (
    select loja_id, faixa_cep_id, n,
           row_number() over (partition by loja_id order by n desc) as posicao,
           count(*) filter (where true) over (partition by loja_id, n) as empatados
    from contagem
  ) ranqueado
  where posicao = 1 and empatados = 1
)
update produtos p
set faixa_cep_id = moda.faixa_cep_id
from moda
where p.loja_id = moda.loja_id
  and p.faixa_cep_id is null
  and coalesce(p.status_produto, '') <> 'Recusado';
