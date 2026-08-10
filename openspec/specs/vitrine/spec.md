# Vitrine Specification

## Purpose
Loja pública do marketplace: home, busca, categoria, página de produto e página de loja. Estado: ✅ produção. Fonte: skills `industria24-marketplace`, `regras-de-negocio`; código em `busca/`, `categoria/`, `produto/`, `loja/`, `src/lib/preco-faixa.ts`, `src/lib/geo.ts`, `src/lib/cep.ts`.

## Requirements

### Requirement: Curadoria de produto visível
O sistema SHALL exibir na vitrine apenas produtos com `StatusProduto = Aprovado`, definido pela curadoria do admin.

#### Scenario: Produto pendente não aparece
- GIVEN um produto com `StatusProduto` diferente de `Aprovado`
- WHEN um comprador navega pela vitrine ou busca
- THEN o produto não é listado em nenhuma tela pública

### Requirement: Portão e filtro por CEP
O sistema SHALL filtrar a disponibilidade de produtos/lojas pelo CEP informado pelo comprador, refletindo estoque real por região.

#### Scenario: Região sem cobertura mostra zero, não erro
- GIVEN um comprador em uma região sem lojas com estoque (ex.: Porto Alegre)
- WHEN a vitrine calcula disponibilidade pelo CEP
- THEN o resultado mostra zero produtos disponíveis, sem tratar isso como bug — é comportamento esperado (só Manaus tem estoque físico confirmado hoje)

### Requirement: Desconto progressivo por faixa de quantidade
O sistema MUST calcular o preço por faixa de quantidade usando `src/lib/preco-faixa.ts` como fonte única, sem duplicar a regra em outras camadas (vitrine e checkout leem a mesma função).

#### Scenario: Preço da faixa vale para todas as unidades
- GIVEN um produto com faixas de desconto progressivo configuradas
- WHEN o comprador seleciona uma quantidade que se enquadra numa faixa
- THEN o preço da faixa se aplica a TODAS as unidades da compra, não apenas às unidades acima do mínimo (não é degrau marginal)

#### Scenario: Clique no card de faixa ajusta a quantidade
- GIVEN a página de produto exibindo cards de faixas de desconto em ordem decrescente de quantidade
- WHEN o comprador clica em um card de faixa
- THEN a quantidade selecionada é ajustada para o `min_qtd` daquela faixa

### Requirement: Preço riscado exige preço real praticado
O sistema SHALL exibir preço "de X por Y" apenas quando X é o menor preço efetivamente praticado nos últimos 30 dias, para conformidade com o CDC.

#### Scenario: Preço riscado sem prática real nos últimos 30 dias
- GIVEN um produto sem histórico de venda pelo valor "de X"
- WHEN a interface tentaria exibir um preço riscado
- THEN o preço riscado não é exibido, evitando desconto fictício

### Requirement: Exibição de Venda Futura (Mercado Futuro)
O sistema SHALL sinalizar visualmente produtos disponíveis apenas por Venda Futura, distinguindo-os de produtos com estoque imediato.

#### Scenario: Produto com Disponibilidade = venda futura
- GIVEN um produto cujo campo `Disponibilidade` (tipo `VendaFutura`) indica pré-venda
- WHEN o produto é exibido na vitrine ou na página do produto
- THEN a interface indica que é compra hoje/entrega depois

## Known Gaps
- Busca usa Postgres (não Elasticsearch, como no Bubble legado); Meilisearch é opção futura, não implementada.
- Promoções progressivas ativas em produção podem ter faixa mais cara que o preço base (bug conhecido) — decisão de correção pendente do dono do produto.
