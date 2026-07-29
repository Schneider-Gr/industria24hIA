---
prd_number: "002"
status: implementado
priority: alta
created: 2026-07-29
issue: ""
depends_on: []
references:
  - "web/DESIGN.md"
  - "supabase/migrations/0002_seller_module.sql"
  - ".claude/plans/https-industria24-com-br-admin-https-ind-eventual-horizon.md"
---

# PRD 002: Redesign PDP + carrinho multi-loja + nova paleta Leroy Merlin

## 1. Contexto

- **Produto/área**: vitrine do comprador — página de produto (PDP), carrinho, checkout, header/navegação global.
- **Origem**: engenharia reversa de referências externas pedida pelo dono — Mercado Livre (PDP: espaçamento, densidade, menos rolagem) e Leroy Merlin (carrinho: agrupamento por remessa; paleta de cores do site inteiro).
- **Estado anterior**:
  - PDP com painel de informações em bloco linear único (preço → descontos → coletiva → ações de compra → descrição), exigindo rolagem até chegar no CTA de compra em telas menores.
  - Carrinho **restrito a uma loja por vez** — `CarrinhoProvider.adicionar()` recusava item de `loja_id` diferente do já presente, com um alerta de conflito ("Esvaziar e adicionar este" / "Manter carrinho"). Consistente com o schema: `pedidos.loja_id` é FK `not null` (migration 0002), então pedido multi-vendedor nunca existiu.
  - Identidade visual "Aço & Sinal" (aço/azul-frio + sinal/laranja + verde-24h), oficial desde 2026-07-16, confirmada pelo dono em 2026-07-19.
  - Sem cross-sell/upsell no carrinho.
  - Tooling `tools/design-loop/{validar,graph,build-graph}.ts` já estava desatualizado antes desta mudança — validava/gerava contra uma paleta ("roxo/laranja/amarelo") retirada de uso em 2026-07-16.

## 2. Solução implementada

### Decisões de produto

1. **Carrinho multi-loja**: a trava de loja única foi removida. Itens de lojas diferentes convivem no mesmo carrinho, agrupados visualmente por loja (bloco "Entrega N" quando há mais de uma), cada grupo com seu subtotal.
2. **Checkout gera N pedidos, um por loja** — não uma migration para permitir múltiplas lojas num único pedido. `pedidos.loja_id` continua `not null`/1 loja por pedido; o checkout particiona os itens do carrinho por `loja_id` e chama a RPC `checkout_criar_pedido` uma vez por grupo, no mesmo submit. Escolhido sobre a alternativa (1 pedido com N lojas) porque reaproveita a RPC e o schema existentes sem migration, e não quebra o painel do seller/repasse (que já opera por `LinhaItem`/pedido).
3. **Nova página `/pedido/confirmacao?ids=...`**: quando o checkout gera mais de 1 pedido, o comprador é redirecionado para uma lista dos N pedidos criados (cada um linkando ao seu detalhe) em vez do antigo redirect único `/pedido/{id}?novo=1`. Com 1 pedido só, o comportamento antigo é mantido.
4. **Cross-sell/upsell**: rail abaixo dos grupos de loja no carrinho, sugerindo produtos da mesma categoria de algo já no carrinho — priorizando a própria loja do item (upsell, sem novo frete) sobre outras lojas cobertas pelo CEP do comprador (cross-sell), usando `lojaCobreCep` (já existente em `src/lib/cep.ts`).
5. **PDP menos rolagem**: bloco de preço/badges/CTA compacto acima da dobra; faixas de desconto progressivo, compra coletiva e descrição viraram `<details>` (accordion) abaixo, fora do caminho direto até o botão de compra.
6. **Troca de paleta "Aço & Sinal" → "Leroy Merlin"**: cores extraídas ao vivo de `leroymerlin.com.br` via `getComputedStyle` em 2026-07-29 (Verificado, não de memória) — **com uma correção deliberada do dono: onde a Leroy Merlin usa verde (CTA, hover), o Industria24h usa azul.** O azul de ação reaproveita `aco-600 #1E5A8A` (já testado na identidade anterior) em vez de um hex novo sem fonte. Ver tabela de tokens abaixo.
7. **Header/menu global**: fundo `lm-marinho` (extraído ao vivo), ícone de categoria (SVG inline, mesmo padrão do `Sidebar.tsx` — sem lib de ícones nova) no botão "Categorias" e em cada item do mega-menu, hierarquia mais forte (borda ativa, peso de fonte).
8. **Tooling `design-loop` corrigido**: `validar.ts`/`graph.ts`/`build-graph.ts` agora validam/geram contra os tokens `lm-*` atuais em vez da paleta retirada de uso há 13 dias — sem essa correção, qualquer execução do loop reintroduziria cor errada nos arquivos que ele tocasse.

### Paleta final (Verificado/Inferido registrado em `DESIGN.md`)

| Token | Hex | Papel | Fonte |
|---|---|---|---|
| `lm-azul` | `#1E5A8A` | CTA/ação (era verde na LM) | Reaproveitado de `aco-600`, já documentado |
| `lm-azul-escuro` | `#164569` | hover do CTA | Inferido — derivado, sem captura ao vivo equivalente |
| `lm-marinho` | `#102739` | header/marca | Verificado, `leroymerlin.com.br`, 2026-07-29 |
| `lm-cinza` | `#EEEEF0` | fundo neutro | Verificado, idem |
| `lm-amarelo` | `#F8CC1C` | destaque de preço/etiqueta | Verificado, idem |
| `lm-vermelho` | `#B42A27` | alerta/promoção | Verificado, idem |

Os tokens `aco-*`/`sinal*`/`verde-24h*` (identidade anterior) permanecem definidos em `globals.css` — não foram removidos, só descontinuados para código novo — porque componentes de catálogo mais amplos (`ProdutoCard`, `LojaCard`, `Tag`, `Entrega24hBadge` em `src/components/vitrine/ui.tsx`) ainda os usam e não foram tocados nesta rodada (fora do escopo: PDP, carrinho, checkout, header/footer de chrome, `MercadoFuturo.tsx`).

### Fora do escopo (explicitamente adiado)

- **Ficha técnica estruturada** (atributos chave/valor por categoria de produto): requer tabela nova (`produto_atributos` EAV ou colunas por categoria), já sinalizado como `[PENDENTE DECISÃO DO DONO]` em `DESIGN.md` antes desta rodada. Não implementado — precisa de confirmação explícita do modelo de dados.
- **Migração de paleta dos cards de catálogo** (`ProdutoCard`, `LojaCard`, `Tag`, `Entrega24hBadge`, home, busca, categoria, loja) — ainda em `aco-*`/`sinal*`/`verde-24h*`. Fica para quando esses componentes forem tocados por outra tarefa.

## 3. Arquivos alterados

- `web/DESIGN.md` — nova seção de paleta Leroy Merlin, paleta "Aço & Sinal" movida para legado, linha nova em `## Decisões`.
- `src/app/globals.css` — tokens `--color-lm-*` adicionados.
- `tools/design-loop/{validar,graph,build-graph}.ts` — validação/prompt atualizados para os tokens `lm-*`.
- `src/components/carrinho/carrinho.tsx` — remoção da trava single-loja e da UI de conflito; paleta.
- `src/app/carrinho/page.tsx` — agrupamento por loja, rail de cross-sell, paleta.
- `src/app/carrinho/actions.ts` (novo) — `buscarCrossSell`, filtrado por categoria + `lojaCobreCep`.
- `src/components/carrinho/CrossSellRail.tsx` (novo).
- `src/app/checkout/page.tsx` + `src/app/checkout/actions.ts` — loop de criação de pedido por loja, aviso multi-loja, paleta.
- `src/app/pedido/confirmacao/page.tsx` (novo) — lista de N pedidos pós-checkout.
- `src/app/produto/[id]/page.tsx` — compactação do painel de informações (accordion), paleta.
- `src/components/vitrine/ui.tsx` — `VitrineHeader`/`VitrineFooter`/`CampoBusca`, paleta de chrome.
- `src/components/vitrine/MegaMenuCategorias.tsx` — ícone de categoria, hierarquia, paleta.
- `src/components/vitrine/MercadoFuturo.tsx` — mesma remoção de trava single-loja (reservas de Mercado Futuro usam o mesmo `adicionar()`), paleta.

## 4. Verificação

- `tsc --noEmit` e `eslint` limpos (0 erros) em todos os arquivos alterados.
- Teste funcional pendente (não executado nesta sessão, requer ambiente com Supabase local/staging): adicionar itens de 2 lojas diferentes ao carrinho, conferir agrupamento visual, concluir checkout e confirmar que N pedidos são criados no banco, cada um com `loja_id` correto e frete/cobrança Asaas próprios.
- Migration de banco: **nenhuma** — toda a mudança de checkout reaproveita `checkout_criar_pedido` (RPC já existente), chamada N vezes em vez de 1.
