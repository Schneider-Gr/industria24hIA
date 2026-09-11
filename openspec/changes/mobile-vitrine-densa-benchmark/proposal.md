## Why

A dona gravou um benchmark do app **Zé Delivery** (`Downloads\redesign-mobile-navegacao_UX.mp4`, 1min40, 392×850, narrado) e pediu um redesign mobile "bem mais otimizado", porque "boa parte dos meus clientes usam o celular para navegar". O ponto central da narração (01:00): "veja que eu consigo rodar a tela com muito mais produtos".

Hoje a vitrine mobile mostra 2 cards por tela nos trilhos (`w-[45%]`), com foto em `object-cover` de ponta a ponta, preço sem a regra de desconto progressivo visível no card, e o botão de adicionar abaixo do nome. O benchmark mostra 2,5 cards por tela, produto contido num quadrado claro, botão "+" sobre a foto, desconto progressivo legível no próprio card e navegação por chips fixos no topo.

## What Changes

- **Card compacto mobile:** foto contida (`object-contain`) sobre quadrado `lm-cinza`, botão "+" sobre o canto inferior direito da foto, selo "Desconto progressivo" em pílula no canto superior esquerdo, preço com unidade e regra da faixa ("R$ 36,07 /un. a partir de 3 un" + "1 un. R$ 48,09" + "−25%").
- **Trilhos mais densos:** largura do item no celular passa de 45% para 40% (2,5 cards visíveis, o meio card sinaliza rolagem).
- **Chips fixos no topo da home mobile:** "Categorias" (abre bottom sheet em grade com imagem) seguido das categorias com produto para o CEP.
- **Bloco de ofertas em card:** a seção de ofertas vira um container de marca com "Ir para Ofertas" no rodapé; cronômetro só onde houver `validade` real na faixa.
- **Pedidos:** "Comprar de novo" no histórico (re-adiciona os itens ao carrinho; preço e estoque revalidados no checkout como hoje).
- **Código de entrega à vista:** o `codigo_retirada` dos pedidos pagos em andamento aparece no topo da conta e da aba Pedidos, não só dentro da página do pedido.
- **Cupons:** "Você já economizou R$ X" no topo de `/cupons`, se `cupom_usos` guardar o valor descontado (a confirmar no schema).
- **Tab bar:** proposta de 5 abas (Início · Buscar · Cupons · Carrinho · Pedidos), com Categorias migrando para o chip fixo. **Decisão do dono** — a tab bar atual (Início · Categorias · Carrinho · Pedidos) foi decidida em 11/09 (PR #584).
- **DESIGN.md:** nova seção "Mobile — vitrine densa" e linhas em `## Decisões` (ver `tasks.md`, grupo 1).

**Fora do escopo:** programa de pontos (o Zé tem, a Indústria 24h não tem schema nem regra), código de entrega fixo por pessoa (o Zé usa um por usuário; aqui o código é por pedido e assim continua), cronômetro sem data de validade real.

## Capabilities

### New Capabilities
- `vitrine/mobile-card-compacto`: card de produto compacto no mobile e densidade dos trilhos.
- `vitrine/mobile-navegacao`: chips fixos com bottom sheet de categorias, tab bar, "Comprar de novo", código de entrega à vista e economia com cupons.

### Modified Capabilities
(nenhuma spec formal prévia de vitrine mobile)

## Impact

- `src/components/vitrine/ui.tsx` (`ProdutoCard`, `ProdutoDescontoCard`, `BotaoAddRapido`), `TrilhoProdutos.tsx` (`ITEM_CLASS`), `BannerGalerias.tsx`, `TabBarMobile.tsx`, `rotas-tabbar.ts`, `MenuConta.tsx`, `src/app/page.tsx`, `src/app/meus-pedidos/`, `src/app/cupons/`, `src/app/conta/` (ou equivalente).
- `tools/design-loop/validar.ts` (regra 5, pílula) — pendência herdada do refresh de 11/09.
- Sem migration prevista. Se a economia com cupons exigir coluna nova, o item sai do escopo e vira pendência.
