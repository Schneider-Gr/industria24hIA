## Why

O PR #523 e a migration 0164 trouxeram do Bubble a cobertura de entrega por produto (`produtos.faixa_cep_id`), mas só 52 dos 206 produtos de produção têm faixa declarada. Dos 69 produtos **aprovados** sem faixa, 46 pertencem a 4 lojas reais que já declararam cobertura em outros produtos seus, e 23 pertencem a lojas de teste (`construção`, `Loja Teste Tour QA`, uma loja sem nome).

Enquanto esse buraco existir, `src/lib/catalogo-compra/faixa-cep-produto.ts` é obrigado a manter o fail-open documentado no próprio arquivo: tratar ausência de faixa como "não entrega" zeraria a vitrine para quem está fora do Norte, repetindo o incidente que o PR #517 corrigiu. O fail-closed fiel ao Bubble só é viável depois que o cadastro fechar.

O painel do seller também não impede a reincidência: o select "Região de entrega" tem `""` como primeira opção, rotulada "Sem restrição de região", e nada obriga a escolha.

## What Changes

- **Migration `0166_backfill_faixa_cep_produto.sql`**: produto sem `faixa_cep_id` herda a faixa que a própria loja já usa nos irmãos (moda por loja). A moda só é aplicada quando é inequívoca — loja com empate entre duas faixas fica fora e vai para revisão manual. Produto `Recusado` fica fora.
- **`ProdutoForm`**: o select de região passa a ser `required`, a opção vazia deixa de prometer "Sem restrição de região" e vira o placeholder "Selecione a região", e o produto novo já nasce com a faixa mais usada pela loja pré-selecionada (`faixaSugerida`).
- **`seller/produtos/page.tsx`**: calcula a faixa modal da loja a partir da lista de produtos que já carrega, sem query nova, e passa ao formulário.

Fora de escopo, deliberadamente: virar a chave do fail-closed em `faixa-cep-produto.ts` (depende do despublish das lojas de teste) e qualquer tela nova de confirmação em lote — são 4 sellers, uma vez; o select que já existe no painel resolve a revisão.

## Capabilities

### Modified Capabilities
- `cobertura-entrega-produto`: todo produto de loja com cobertura declarada passa a ter faixa, e o cadastro novo passa a exigi-la.

## Impact

Verificado em produção (`tiwdqgyeyvceaiqqwitc`) com `begin; … rollback;`:

| | antes | depois |
|---|---|---|
| produtos sem faixa | 154 | 25 |
| aprovados sem faixa | 69 | 23 |
| produtos com faixa | 52 | 181 |

Os 25 que sobram são 23 aprovados das 3 lojas de teste, 1 recusado e 1 em análise de uma loja que nunca declarou cobertura. Nenhum produto de loja real ativa fica sem faixa.

Risco assumido: a moda erra em loja de cobertura mista. A Viva Ecológica tem 23 produtos em Manaus e 3 no Acre, então os 4 produtos herdados vão para Manaus e podem estar errados. A faixa **não** é derivável do CEP da loja (a Cerâmica Iguatú fica em Rio Branco e entrega em Manaus), então não há critério melhor sem perguntar ao seller. Os 4 sellers precisam ser avisados para revisar no painel; a marcação na vitrine é aviso, o bloqueio real continua em `checkout_criar_pedido`.

Nenhuma mudança de RLS, nenhuma coluna nova.
