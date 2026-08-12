## Why

Hoje, quando o carrinho tem produtos de mais de uma loja, o checkout gera **pedidos separados por loja, cada um com seu próprio frete** (`checkout/page.tsx:124`). O comprador paga frete integral em cada pedido mesmo quando os produtos poderiam compartilhar uma mesma entrega/rota, o que infla o custo total e reduz a taxa de conversão em carrinhos multi-loja. O recurso existente de "frete consolidado" (migration 0074) é um desconto de 30% que insere o pedido em um lote de rota já em produção — não resolve isso: ele atua sobre um único pedido, não junta o frete de vários produtos/lojas no mesmo checkout.

## What Changes

- No checkout, ao existir itens de múltiplas lojas no mesmo carrinho, calcular e exibir um **frete único consolidado** para o conjunto, em vez de um frete por pedido/loja.
- Definir a regra de rateio desse frete consolidado entre os pedidos gerados por loja (para fins de repasse e exibição no painel seller).
- Deixar explícito no checkout quando a consolidação se aplica (ex.: mesma cidade/CEP de destino, elegibilidade de transportador) e quando o comprador cai de volta no frete separado atual.
- Compatibilizar com o desconto de "frete consolidado" (0074/lote de rota) já existente — definir se os dois benefícios se acumulam ou são mutuamente exclusivos.

## Capabilities

### New Capabilities
- `checkout/frete-consolidado-multi-produto`: cálculo, exibição e rateio de um frete único para pedidos de múltiplas lojas no mesmo checkout.

### Modified Capabilities
- (nenhuma até confirmação — o frete consolidado 0074/lote de rota é um mecanismo separado; se a interação entre os dois exigir mudança de comportamento nele, listar aqui após decisão de design)

## Impact

- `src/app/checkout/page.tsx` — UI de exibição do frete (hoje mostra frete por pedido/loja).
- `src/app/checkout/actions.ts` — lógica de criação de pedido(s) e do frete estimado/consolidado.
- Cálculo oficial de frete (server-side, hoje citado como fonte de verdade em `checkout/page.tsx:15-17`) — precisa suportar cotação para múltiplos destinos/lojas de uma vez.
- Tabela(s) de pedido e repasse — se o frete passar a ser rateado entre pedidos de lojas diferentes, o schema de repasse por loja precisa refletir a fração de frete atribuída a cada uma (checar skill `regras-de-negocio` e `asaas-pagamentos` antes de tocar em repasse).
- Painel seller — exibição de frete por pedido pode precisar indicar "frete consolidado com outros pedidos".
