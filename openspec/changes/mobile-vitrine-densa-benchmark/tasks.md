## 0. Decisões do dono (antes de codar)

- [x] 0.1 Tab bar: **Início · Buscar · Cupons · Carrinho · Pedidos** (dona, 11/09). Categorias saiu da tab bar e virou chip no topo da home.
- [x] 0.2 Cor do "+": **azul** `lm-azul` (dona, 11/09). O amarelo continua reservado à etiqueta de preço.
- [x] 0.3 Cronômetro: **só onde houver `validade` real** na faixa (dona, 11/09).
- [x] 0.4 (nova, 11/09) Topo mobile: reduzir o espaço, com logo em ícone (só o carrinho da marca) e busca menor que recolhe ao rolar, como no benchmark. Absorve a US01 do PRD 033 (rascunho sem PR). As US02 (atalhos de campanha por CEP) e US04 (FAB que recua) do PRD 033 não foram decididas e ficam fora.

## 1. DESIGN.md (plano de alteração da documentação)

- [x] 1.1 Nova seção `## Mobile — vitrine densa (benchmark Zé Delivery, 2026-09-11)`.
- [x] 1.2 `### Tab bar inferior mobile`: pendência "Afiliados por Categorias" marcada como resolvida, apontando para a seção nova.
- [x] 1.3 `### Card de produto no grid mobile` aponta para o card compacto.
- [x] 1.4 "+" azul registrado na seção nova e em `## Decisões`.
- [x] 1.5 Linhas novas em `## Decisões`.
- [x] 1.6 Regra 5 de `tools/design-loop/validar.ts` aceita pílula em chip/tag/badge.

## 2. Card compacto

- [x] 2.1 `ProdutoCard`/`ProdutoDescontoCard`: quadrado `lm-cinza`, `aspect-square`, `object-contain` abaixo de `sm`; desktop mantém 4:3 com `object-cover`.
- [x] 2.2 `BotaoAddRapido` sobre a foto, 44px de toque, quadrado de 36px em `lm-azul`, ícone "+".
- [x] 2.3 `resumoDescontoProgressivo` + `validadeMaisProxima` em `src/lib/catalogo-compra/desconto-progressivo.ts` com `.test.ts` (red confirmado antes do green). Corrige também um bug: a home e as galerias de desconto calculavam o menor preço incluindo faixas **vencidas**.
- [ ] 2.4 Migrar tokens `aco-*`/`sinal` dos componentes tocados: `ProdutoCard`/`ProdutoDescontoCard` já não usam token antigo; o resto de `ui.tsx` fica para o próximo PR que tocar cada componente.

## 3. Trilhos

- [x] 3.1 `w-[45%]` → `w-[40%]` em `TrilhoProdutos`, no default de `GaleriaCarrossel`, em `VendaFuturaGaleria` e em `MercadoFuturo` (este passa `itemClassName` próprio desde o #596).

## 4. Topo mobile, chips e bottom sheet

- [x] 4.1 Linha 1 com 48px: logo reduzido à marca (recorte do mesmo PNG com `object-left`), CEP como "Cidade, UF", conta e menu.
- [x] 4.2 Busca de 36px, fonte 16px (evita o zoom do iOS ao focar).
- [x] 4.3 Chips de categoria na home, só com categorias que têm produto visível para o CEP; primeiro chip "Categorias" abre bottom sheet em `createPortal`, grade de 2 colunas com ícone, Escape, toque fora e botão fechar, foco devolvido ao chip.
- [x] 4.4 `TopoRecolhivel`: busca e chips recolhem ao rolar para baixo e voltam ao rolar para cima; não recolhe com foco dentro nem com modal aberto; tolerância de 10px; trava de 300ms contra o loop do scroll anchoring; sem animação sob `prefers-reduced-motion`.

## 5. Ofertas

- [x] 5.1 `DealsCountdown` conta até a validade real da faixa e some sem ela (antes contava até a meia-noite de qualquer dia). O container de ofertas com "Ir para Ofertas" ficou fora: não existe página de ofertas para onde levar.

## 6. Tab bar

- [x] 6.1 `TabBarMobile.tsx` com as 5 abas de 0.1 e `aria-current` na aba ativa.

## 7. Pedidos e conta

- [x] 7.1 "Comprar de novo" em `/meus-pedidos`: server action `buscarRecompra` + `montarRecompra` (com `.test.ts`); `adicionarVarios` no carrinho (chamar `adicionar` em laço perdia itens).
- [x] 7.2 Cartão "Seu código de entrega" no topo de `/meus-pedidos` (a aba Pedidos) para pedido pago com item ainda não entregue; atalho "Código de entrega" no menu de conta. Sem o nome da loja: a view `pedidos_cliente` não expõe `loja_id`, então o cartão identifica pelo número do pedido.
- [x] 7.3 Economia com cupons: **fora do escopo**. `cupom_usos` não guarda o valor descontado (colunas: `checkout_ref`, `criado_em`, `cupom_id`, `id`, `pedido_id`, `user_id`).

## 8. Verificação

- [x] 8.1 `npm run test`, `tsc --noEmit` e `npm run lint` verdes.
- [ ] 8.2 Medir em produção com cache-buster a 360×800 e 412×915 depois do deploy (bloqueado pelo limite diário da Vercel em 11/09).
- [x] 8.3 `openspec validate mobile-vitrine-densa-benchmark` limpo.
