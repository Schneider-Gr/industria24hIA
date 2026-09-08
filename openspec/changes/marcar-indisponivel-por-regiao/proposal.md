## Why

`filtrarPorFaixaCep` (`src/lib/catalogo-compra/faixa-cep-produto.ts`) **remove** da listagem o produto cuja faixa de CEP não cobre o comprador. A plataforma legada não faz isso: navegação no `industria24h.com.br` em 08/09/2026 (CEP 69088-068 Manaus e 90050-100 Porto Alegre) mostra o card no lugar, com foto, nome e preço, e substitui o preço promocional por **"Indisponível na sua região"** em vermelho (`rgb(178,58,58)`).

Esconder tem dois custos. O comprador não descobre que o produto existe, então não há motivo para ele cadastrar o CEP certo nem para o seller ampliar a cobertura. E a home fica inconsistente consigo mesma: as galerias (`buscarGaleriasVitrine`) nunca passaram pelo filtro, então o mesmo produto desaparecia de uma seção e continuava em outra.

O dono decidiu em 08/09 pela opção híbrida: a home **pede** o CEP como o Mercado Livre, mas **lista tudo com rótulo** como o Bubble. A referência dele em Jam (`jam.dev/c/4f96632d-2a89-483b-bae5-168bbad41f9d`) mostra o gate duro do ML, que ele explicitamente não quer.

O copy do `CardLocalizacao` ainda promete "Nada some do catálogo", que passa a ser verdade só depois desta mudança.

## What Changes

- `faixa-cep-produto.ts`: `filtrarPorFaixaCep` vira `marcarPorFaixaCep`, que devolve os mesmos itens com `indisponivelRegiao: boolean` em vez de uma lista menor. A regra pura `cepCobertoPelaFaixa` não muda.
- `ProdutoCard` e `ProdutoDescontoCard` (`src/components/vitrine/ui.tsx`): com `indisponivel`, o card esconde os botões de compra e o preço promocional, e mostra "Indisponível na sua região" em vermelho.
- Home, categoria e busca passam a marcar em vez de filtrar.
- Copy do `CardLocalizacao` alinhado ao comportamento.

Fora de escopo: marcar as galerias da home (elas usam `ProdutoDescontoCard` por outro caminho e não recebem o CEP hoje) e a PDP, que já avisa por conta própria. O bloqueio real continua em `checkout_criar_pedido`.

## Capabilities

### Modified Capabilities
- `cobertura-entrega-produto`: produto fora da faixa passa a ser exibido e rotulado, não removido.

## Impact

Nenhuma migration, nenhuma coluna, nenhuma mudança de RLS. Depois do backfill da 0166, 181 dos 206 produtos têm faixa, então a marcação passa a ser visível de verdade: para CEP de Porto Alegre praticamente todo o catálogo aparece rotulado, o que é o comportamento pedido e o oposto do que o filtro fazia (catálogo vazio).
