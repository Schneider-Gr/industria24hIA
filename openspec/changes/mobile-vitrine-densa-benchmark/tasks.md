## 0. Decisões do dono (antes de codar)

- [ ] 0.1 Tab bar: manter Início · Categorias · Carrinho · Pedidos (PR #584) ou passar para Início · Buscar · Cupons · Carrinho · Pedidos, com Categorias no chip fixo.
- [ ] 0.2 Cor do "+" do card: `lm-azul` (respeita o refresh de 11/09) ou amarelo como no Zé (exige revogar a regra "amarelo nunca como fundo de botão" no DESIGN.md).
- [ ] 0.3 Cronômetro no bloco de ofertas: só com `validade` real na faixa, ou fora do escopo.

## 1. DESIGN.md (plano de alteração da documentação)

- [ ] 1.1 Nova seção `## Mobile — vitrine densa (benchmark Zé Delivery, 2026-09-11)` com: largura de trilho 40% abaixo de `sm`, card compacto (quadrado `lm-cinza`, `object-contain`, padding 10px, nome 13px, preço 16px), "+" sobre a foto 44px, regra de escrita do desconto progressivo, chips fixos + bottom sheet, código de entrega à vista.
- [ ] 1.2 Atualizar `### Tab bar inferior mobile` com a decisão 0.1 e remover o "[PENDENTE DECISÃO DO DONO] trocar Afiliados por Categorias", que já foi resolvido em 11/09.
- [ ] 1.3 Atualizar `### Card de produto no grid mobile` e `## Card de Produto — hierarquia e estados` com o card compacto (substitui `aspect-square`/`object-cover` no mobile).
- [ ] 1.4 Registrar em `## Cor` a decisão 0.2 sobre o amarelo.
- [ ] 1.5 Linhas novas em `## Decisões`: benchmark Zé Delivery como referência estrutural (não de paleta), densidade 2,5 cards, "+" sobre a foto, desconto progressivo escrito no card, código de entrega por pedido (não por usuário).
- [ ] 1.6 Ajustar a regra 5 de `tools/design-loop/validar.ts` para aceitar pílula em chip/tag/badge (pendência do refresh, PR #604).

## 2. Card compacto

- [ ] 2.1 `ProdutoCard`/`ProdutoDescontoCard` (`ui.tsx`): quadrado `lm-cinza` + `object-contain` abaixo de `sm`; desktop inalterado.
- [ ] 2.2 `BotaoAddRapido` sobre a foto, canto inferior direito, `min-h-11 min-w-11`, cor conforme 0.2.
- [ ] 2.3 Função pura `textoDescontoProgressivo(valorBase, faixas)` em `src/lib/catalogo-compra/` com `.test.ts` (faixa válida, vencida, mais cara que o base, sem faixa) — red/green antes de plugar no card.
- [ ] 2.4 Migrar os tokens `aco-*`/`sinal` dos componentes tocados para `lm-*` (regra de dívida do DESIGN.md).

## 3. Trilhos

- [ ] 3.1 `ITEM_CLASS` de `TrilhoProdutos.tsx` e o default de `GaleriaCarrossel`: `w-[45%]` → `w-[40%]` abaixo de `sm`.

## 4. Chips fixos e bottom sheet

- [ ] 4.1 Faixa de chips `sticky` abaixo do header na home mobile, só categorias com produto no CEP (reusar a lista já filtrada da home).
- [ ] 4.2 Bottom sheet de categorias em `createPortal(document.body)`, grade 2 colunas, Escape/toque fora/botão fechar, foco preso enquanto aberto.

## 5. Ofertas em card

- [ ] 5.1 Container da seção de ofertas com rodapé "Ir para Ofertas"; cronômetro conforme 0.3.

## 6. Tab bar

- [ ] 6.1 `TabBarMobile.tsx` + `rotas-tabbar.ts` conforme 0.1.

## 7. Pedidos e conta

- [ ] 7.1 "Comprar de novo" no histórico: re-adiciona itens disponíveis via `useCarrinho`, aviso nomeando os indisponíveis, conflito de loja pelo fluxo atual.
- [ ] 7.2 Cartão "Seu código de entrega" no topo da conta e da aba Pedidos: `pedidos.codigo_retirada` de pedidos pagos e não entregues, com o nome da loja.
- [ ] 7.3 Confirmar no schema se `cupom_usos` guarda o valor descontado; se sim, bloco "Você já economizou" em `/cupons` (12 meses); se não, marcar o requisito como fora do escopo.

## 8. Verificação

- [ ] 8.1 `npm run test`, `tsc --noEmit` e `npm run lint` verdes.
- [ ] 8.2 Medir em produção com cache-buster, `Emulation.setDeviceMetricsOverride` 360×800 e 412×915: 2,5 cards por trilho, `scrollWidth` do documento igual à viewport, "+" com 44px via `getBoundingClientRect`, bottom sheet acima da tab bar e do FAB via `elementFromPoint`.
- [ ] 8.3 `openspec validate mobile-vitrine-densa-benchmark` limpo.
