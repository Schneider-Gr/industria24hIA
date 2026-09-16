<!-- Issue: Schneider-Gr/industria24hIA#655 -->

## Why

Duas travas de compra mínima já existem no banco e são invisíveis para o
comprador até o último clique:

- **Quantidade mínima por produto** (`produtos.quantidade_minima`), validada em
  `checkout_criar_pedido` (0140:139). O stepper do carrinho respeita o mínimo,
  mas um carrinho antigo em `localStorage` ou um produto cujo mínimo subiu
  depois da adição passam por baixo.
- **Ticket mínimo da loja** (`lojas.valor_pedido_minimo`), validado em
  `checkout_criar_pedido` (0140:214). Não existe **nenhum** aviso no carrinho:
  a única pista é o badge "mín. R$ X" no card da loja na vitrine
  (`src/components/vitrine/ui.tsx:679`).

O comprador monta o carrinho, preenche o checkout inteiro e recebe a mensagem
crua da exception do Postgres ("Pedido abaixo do valor mínimo da loja (R$ %)").
Em operação de atacado — material de construção, olaria — onde o ticket mínimo é
a regra e não a exceção, isso é abandono de carrinho garantido.

Há um agravante já em produção: `src/app/checkout/actions.ts:171` cria **um
pedido por loja em loop, sem rollback** (comentado nas linhas 216-218). Num
carrinho multiloja em que a segunda loja reprova no mínimo, a primeira já gerou
pedido e cobrança Asaas. O gate no carrinho remove a causa mais provável desse
cenário.

## What Changes

- **Painel de bloqueio por grupo de loja no carrinho**, no formato do legado
  (industria24h.com.br): borda vermelha no grupo, título
  `"[Nome da loja] – compra mínima R$ X"` no topo dos itens daquela loja, e o
  botão de finalizar substituído por `"Adicione mais itens ao seu carrinho!"`
  desabilitado.
- **As duas travas compartilham o mesmo painel**: quantidade mínima violada em
  qualquer item do grupo bloqueia o grupo pelo mesmo mecanismo, com a linha do
  item apontada. Uma trava não substitui a outra — um carrinho pode ter todos os
  itens acima da quantidade mínima e ainda não atingir o ticket da loja.
- **Fechamento parcial**: o bloqueio é por loja. As lojas que atingiram o mínimo
  seguem para o checkout normalmente; só os itens da loja bloqueada ficam
  retidos no carrinho. Isso já é viável porque o checkout cria um pedido por
  loja.
- **Cross-sell e upsell direcionados ao desbloqueio**: dentro do painel do grupo
  bloqueado, sugestões **apenas da loja bloqueada** (produto de outra loja não
  ajuda a atingir aquele ticket), ordenadas pelo gap que falta, priorizando a
  faixa de 60% a 130% do gap.
- **Guarda de cupom**: cupom que levaria o subtotal da loja abaixo do ticket
  mínimo é **recusado** — o cupom não se aplica, o pedido segue pelo valor
  cheio. O pedido nunca é bloqueado por causa do cupom. O comprador recebe o
  motivo explícito, não um silêncio.

Fora de escopo: pré-validação de todos os grupos antes do loop de criação de
pedidos (cobre também estoque e cobertura de CEP — tratar em change própria);
mover o cadastro do ticket mínimo para a tela de Produtos (segue em Minha Loja);
alterar a base de comparação do ticket mínimo.

## Capabilities

### New Capabilities
- `checkout-travas-minimas`: convivência das duas travas de mínimo, bloqueio por
  grupo de loja no carrinho com fechamento parcial, sugestões de desbloqueio e
  guarda de cupom contra o ticket mínimo.

### Modified Capabilities
<!-- Nenhuma. `seller-produtos` (quantidade mínima) e `seller-minha-loja`
     (valor do ticket) não mudam de contrato: seus campos continuam sendo
     cadastrados no mesmo lugar, apenas passam a ser lidos pela nova
     capability. `checkout-cupom-desconto` ganha uma guarda definida aqui. -->

## Impact

- **Banco**: nova migration. A comparação do ticket mínimo em
  `checkout_criar_pedido` (0140:214) **não muda de base** — continua sobre
  `v_total_itens` (itens, com desconto progressivo, sem frete). A mudança é
  aditiva: no ponto em que o cupom é aplicado, recusar o cupom cujo resultado
  ficaria abaixo de `lojas.valor_pedido_minimo`. Mudança aditiva, e não
  rearranjo da ordem de cálculo, para não regredir desconto progressivo, venda
  futura e frete consolidado, que compartilham o trecho.
- **Caminho do dinheiro**: toca a RPC de criação de pedido. Testar a migration
  em `begin; ... select <verificações>; rollback;` via `supabase db query
  --linked` antes de aplicar.
- **UI**: `src/app/carrinho/page.tsx` (agrupamento por loja já existe em
  `agruparPorLoja`, linhas 10-16; hoje o botão "Fechar pedido" é único para o
  carrinho inteiro, nas linhas 307 e 357 — desktop e sticky mobile);
  `src/components/carrinho/carrinho.tsx` precisa passar a carregar
  `valor_pedido_minimo` da loja, hoje ausente do `ItemCarrinho`.
- **Cross-sell**: `src/components/carrinho/CrossSellRail.tsx` e
  `src/app/carrinho/actions.ts` — `buscarCrossSell` já calcula `mesmaLoja`
  (linha 86) e ordena por ele (linha 89), mas não filtra por loja única nem
  ordena por gap.
- **Checkout**: `src/app/checkout/actions.ts` precisa tratar a exception do
  mínimo com mensagem legível, já que o gate do carrinho reduz mas não elimina
  o caminho (carrinho em outra aba, mínimo alterado entre o carrinho e o
  checkout).
