## 1. Slug central

- [x] 1.1 `src/lib/slug.ts`: `slugify(texto)` (acentos, minúsculas, hífens, truncado) + `permalinkProduto(id, nome)`, `permalinkLoja(id, nome)`, `permalinkCategoria(id, nome)`, `permalinkColetiva(id, nomeProduto)`, `extrairIdDoParam`
- [x] 1.2 `slug.test.ts` cobrindo acentos, caracteres especiais, nome vazio/curto, truncamento, fallback sem slug (6/6 passando)

## 2. Rotas aceitam uuid puro ou uuid+slug

- [x] 2.1 `produto/[id]/page.tsx`: extrai os 36 primeiros chars do param (`generateMetadata` e a página) antes da query no Supabase
- [x] 2.2 Mesmo tratamento em `loja/[id]/page.tsx`, `categoria/[id]/page.tsx` e `coletiva/[id]/page.tsx`
- [x] 2.3 Link antigo (uuid puro) e novo (uuid+slug) resolvem pro mesmo registro — confirmado pela lógica de `extrairIdDoParam` (slice fixo de 36 chars), sem redirect

## 3. Canonical + JSON-LD + og:image

- [x] 3.1 `alternates.canonical` no `generateMetadata` de produto/loja/categoria/coletiva, usando o permalink com slug
- [x] 3.2 JSON-LD `Product`+`Offer` em produto (nome, preço, disponibilidade por estoque, imagens, `aggregateRating` real só quando há avaliação — sem inventar nota)
- [x] 3.3 JSON-LD `Organization`+`BreadcrumbList` em loja; `BreadcrumbList` em categoria
- [x] 3.4 `og:image`/`twitter:image` reais em produto (primeira imagem por `ordem`) e loja (`logotipo_url`)

## 4. next/image nas páginas de vitrine

- [x] 4.1 Trocado os 2 `<img>` cru de `loja/[id]/page.tsx` por `next/image` com `unoptimized` (domínio das imagens é livre — cadastro do seller, sem host fixo pra `remotePatterns`; documentado no código)
- [ ] 4.2 **Fora do escopo desta rodada**: outros `<img>` cru ainda existem em `ProdutoCard`/`ProdutoDescontoCard`/`GroceryCard` (`components/vitrine/ui.tsx`), `CrossSellRail.tsx`, `VendaFuturaGaleria.tsx`, `LogoIndustria24h` — mesmo motivo (domínio de imagem não controlado). Warnings confirmados no lint desta sessão, não corrigidos aqui para não expandir o escopo além do que a spec original (produto/loja/categoria/coletiva) cobria

## 5. Links internos usando o permalink com slug

- [x] 5.1 Atualizado onde `nome` já estava disponível localmente (zero query nova): `components/vitrine/ui.tsx` (3 cards + `BotoesRapidosCard`), `components/vitrine/CampoBusca.tsx`, `components/carrinho/CrossSellRail.tsx`, `components/vitrine/VendaFuturaGaleria.tsx`, `coletiva/[id]/page.tsx`
- [ ] 5.2 **Fora do escopo desta rodada**: `components/afiliado/LinkDivulgacao.tsx` (o link de comissão do afiliado) — exigiria join novo de `produtos.nome`/`lojas.nome` na query de `(afiliado)/afiliado/page.tsx` e mudança no tipo `AfiliacaoLink`; maior superfície tocada, fica pra uma spec dedicada
- [ ] 5.3 **Fora do escopo**: `(admin)/admin/produtos/[id]/page.tsx`, `(afiliado)/afiliado/page.tsx` (outros 2 links), `(seller)/seller/mensagens/[id]/page.tsx`, `mensagens/[id]/page.tsx` — todos atrás de login, sem crawler indexando, ganho de SEO nulo; `revalidatePath`/`redirect` para `/produto/${id}` em `actions.ts` mantidos como estão (chave de cache/redirect funcional, não um link clicável por usuário/crawler)
- [x] 5.4 `src/app/sitemap.ts` e `src/app/feed-produtos.xml/route.ts`: URLs com slug (feed mantém `g:id` como o UUID puro — obrigatório pro Merchant Center não recriar o produto a cada mudança de nome)

## 6. Fechamento

- [x] 6.1 `tsc --noEmit` (app), `eslint` (0 erros, só warnings pré-existentes de `<img>` fora do escopo), `npm run test` (35/35), `npm run build` completo — todos limpos
- [ ] 6.2 PR referenciando a Issue (`Closes #342`)
- [ ] 6.3 Após merge: confirmar ao vivo canonical/JSON-LD em uma página de produto real e link antigo (uuid puro) ainda funcionando
