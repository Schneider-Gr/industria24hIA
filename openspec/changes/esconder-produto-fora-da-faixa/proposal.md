## Why

Em 08/09/2026 o dono revisou a decisão da manhã. A listagem passou a rotular o produto fora da faixa em vez de escondê-lo (PRs #526 e #530), e ele pediu o comportamento oposto: o produto cuja faixa de CEP declarada pelo seller não cobre o comprador **não deve ser exibido**.

A consequência foi apresentada com número antes da decisão e aceita. Depois dos backfills 0166 e 0167 os 111 produtos aprovados têm faixa, e as faixas cadastradas cobrem só AM, AC e DF:

| CEP do comprador | produtos visíveis |
|---|---|
| Manaus 69088-068 | 72 |
| Rio Branco 69903-012 | 22 |
| Porto Alegre 90050-100 | 14 |
| São Paulo 01310-100 | 0 |

Vitrine vazia onde nenhum seller declarou cobertura passa a ser o comportamento correto, não um incidente.

## What Changes

- `esconderForaDaFaixa` substitui `marcarIndisponiveis` no módulo puro; `filtrarPorFaixaCep` volta a ser o nome da função de I/O.
- Home, categoria e busca filtram. Na home o filtro alcança as quatro listas com a mesma consulta única (produtos, descontos, supermercado, galerias), e a galeria que fica sem produto some junto — trilho vazio com título é pior que nenhum trilho.
- Sai o rótulo "Indisponível na sua região" de `ProdutoCard`, `ProdutoDescontoCard` e `GroceryCard`, e o campo `indisponivelRegiao` dos tipos: sem a marcação, era código morto.
- Copy do `CardLocalizacao` volta a descrever o filtro.

## Capabilities

### Modified Capabilities
- `cobertura-entrega-produto`: produto fora da faixa deixa de ser exibido.

## Impact

Sem migration e sem mudança de RLS. O bloqueio de venda continua também em `checkout_criar_pedido`.

Risco assumido e conhecido: a vitrine fica vazia para a maior parte do país até os sellers ampliarem a cobertura, e a home sem produto algum mostra "Nenhum produto disponível ainda". O caminho para reduzir isso é cadastro, não código: pré-seleção da faixa pelo CEP de origem e herança loja→produto, ambos ainda na fila.
