## Why

Segunda rodada de SEO, seguindo `openspec/changes/seo-indexacao-ia/` (#340/#341, já em produção). Confirmado por leitura direta do código em 2026-08-20: nenhuma página de vitrine emite dado estruturado (JSON-LD), nenhuma tem `<link rel="canonical">`, `loja/[id]` usa `<img>` cru em vez de `next/image` (penaliza LCP/Core Web Vitals), e toda página herda o `og:image` genérico do layout raiz em vez da imagem real do produto/loja. Além disso as URLs de produto/loja/categoria são só o UUID (`/produto/{id}`), sem sinal textual para o buscador — cauda longa de "nome do produto + Manaus" fica mais fraca sem o termo no path.

## What Changes

- `src/lib/slug.ts`: função `slugify` + `permalinkProduto/Loja/Categoria(id, nome)` gerando `/produto/{uuid}-{slug-do-nome}` (e equivalentes loja/categoria) — decorativo, sem coluna nova (calculado a partir de `nome` a cada render), sem migration, sem redirect. Busca no banco continua pelos 36 primeiros caracteres do param (o UUID), então qualquer link já publicado (afiliado, QR code, sitemap antigo) continua funcionando sem alteração.
- `generateMetadata` de `produto/[id]`, `loja/[id]`, `categoria/[id]`, `coletiva/[id]` ganha `alternates.canonical` apontando pro permalink com slug — resolve a duplicidade entre a URL com e sem slug sem precisar de redirect 301.
- JSON-LD (`Product`+`Offer` em produto, `LocalBusiness`/`Organization` em loja, `BreadcrumbList` nas três) injetado via `<script type="application/ld+json">`, com dados reais (nome, preço, disponibilidade por estoque, imagem) — nunca inventado quando o dado não existe.
- `og:image`/`twitter:image` reais: primeira imagem do produto (`produto_imagens` ordenada por `ordem`) e logotipo/banner da loja, substituindo a logo genérica nessas páginas.
- `next/image` nas duas ocorrências de `<img>` cru em `loja/[id]` (confirmadas no lint da spec anterior).
- Atualizar os ~15 pontos internos que constroem `/produto/${id}` manualmente (carrinho, afiliado, mensagens, admin, cross-sell, busca) para usar `permalinkProduto` — ganho de SEO nos links internos, sem quebrar nenhum (o id continua no início do path).

## Capabilities

### New Capabilities
- `seo-onpage-avancado`: dado estruturado (JSON-LD), canonical tag, imagem social real e URL com nome do produto/loja/categoria nas páginas de vitrine pública.

### Modified Capabilities
_Nenhuma — capability nova, complementar a `seo-indexacao-ia` (não a substitui; sitemap/robots/llms.txt/feed continuam como estão)._

## Impact

- **Código afetado**: `src/lib/slug.ts` (novo), `src/app/produto/[id]/page.tsx`, `src/app/loja/[id]/page.tsx`, `src/app/categoria/[id]/page.tsx`, `src/app/coletiva/[id]/page.tsx`, `src/app/sitemap.ts`, `src/app/feed-produtos.xml/route.ts`, e os ~15 arquivos que hoje montam `/produto/${id}` direto (lista completa em `tasks.md`).
- **Sem migration, sem redirect** — decisão do brainstorm (2026-08-20): slug decorativo calculado on-the-fly, nunca persistido; links antigos sem slug continuam válidos indefinidamente.
- **Dependências externas**: nenhuma nova.
- **Risco**: baixo — mudança aditiva em metadata/links internos, rota `[id]` continua aceitando o formato antigo (uuid puro) sem quebra.
