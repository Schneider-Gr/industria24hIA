## Why

O industria24.com.br não tem `sitemap.xml`, `robots.txt` nem `llms.txt`, e a
maioria das páginas de vitrine pública (produto, loja, categoria, coletiva)
não define `<title>`/`<meta description>` próprios — caem no fallback
genérico ("Indústria 24h") do `layout.tsx`. Na prática isso significa: o
Google não tem um mapa confiável do site para rastrear (ele descobre páginas
por link interno, sem prioridade nem frequência declarada), e assistentes de
IA que buscam a web não têm um resumo estruturado do que o marketplace
oferece para citar/recomendar. Confirmado por leitura direta do código
nesta sessão (2026-08-19) — não é suposição de brief.

## What Changes

- `src/app/sitemap.ts`: sitemap dinâmico (Next.js `MetadataRoute.Sitemap`)
  com páginas estáticas do marketplace público + produtos aprovados, lojas
  ativas, categorias e coletivas abertas puxados direto do Supabase (sem URL
  inventada).
- `src/app/robots.ts`: libera rastreamento das rotas públicas e bloqueia
  áreas logadas/admin/checkout/carrinho; aponta para o sitemap.
- `public/llms.txt`: resumo estruturado do marketplace (o que é, para quem,
  produtos/serviços, docs) para consumo por LLMs que buscam a web.
- `generateMetadata` real (dados do Supabase, não copy genérica) em
  `produto/[id]`, `loja/[id]`, `categoria/[id]` e `coletiva/[id]` — as 4
  famílias de página pública que hoje herdam o título/descrição default do
  layout raiz.
- Documentação do passo a passo de cadastro/verificação no Google Search
  Console e do plano de palavras-chave (fora do código — ver `design.md`).

## Capabilities

### New Capabilities
- `seo-indexacao-ia`: o site expõe sitemap, robots.txt e llms.txt corretos,
  e as páginas de vitrine pública têm metadata (title/description) real
  derivada do dado exibido, não do fallback genérico do layout.

### Modified Capabilities
_Nenhuma — não há capability de SEO/indexação especificada antes desta
mudança em `openspec/specs/`._

## Impact

- **Código afetado**: `src/app/sitemap.ts` (novo), `src/app/robots.ts`
  (novo), `public/llms.txt` (novo), `src/app/produto/[id]/page.tsx`,
  `src/app/loja/[id]/page.tsx`, `src/app/categoria/[id]/page.tsx`,
  `src/app/coletiva/[id]/page.tsx`.
- **Dependências externas**: nenhuma nova — usa `createPublicClient()`
  (anon key, já existente) para ler `produtos`, `lojas_vitrine`,
  `categorias`, `compras_coletivas`. Sem escrita, sem service role.
- **Sem migration**: não há schema novo — leitura de colunas já existentes
  (`status_produto`, `situacao` via view `lojas_vitrine`, `status` de
  `compras_coletivas`).
- **Fora do escopo desta mudança**: cadastro real no Google Search Console e
  no Google Ads (ação manual do dono da conta, fora de código — orientação
  no `design.md`); pesquisa de palavra-chave paga/ferramenta de terceiro
  (usa achados desta sessão como ponto de partida, sem acesso a
  Search Console/Keyword Planner ainda).
