# Graph Report - web  (2026-07-24)

## Corpus Check
- 116 files · ~112,097 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 451 nodes · 771 edges · 45 communities (31 shown, 14 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `68bc8fb7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Design System — Indústria 24h|Design System — Indústria 24h]]
- [[_COMMUNITY_graph.ts|graph.ts]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_run.ts|run.ts]]
- [[_COMMUNITY_dependencies|dependencies]]
- [[_COMMUNITY_ui.tsx|ui.tsx]]
- [[_COMMUNITY_database.types.ts|database.types.ts]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_register|register]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_ui.tsx|ui.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_industria24h-mcp|industria24h-mcp]]
- [[_COMMUNITY_index.ts|index.ts]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_route.ts|route.ts]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_sentry-diag.sh|sentry-diag.sh]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_sentry-setup.sh|sentry-setup.sh]]
- [[_COMMUNITY_actions.ts|actions.ts]]
- [[_COMMUNITY_web — Fundação Industria24h|web — Fundação Industria24h]]
- [[_COMMUNITY_AGENTS|AGENTS.md]]
- [[_COMMUNITY_eslint.config.mjs|eslint.config.mjs]]
- [[_COMMUNITY_next.config.ts|next.config.ts]]
- [[_COMMUNITY_postcss.config.mjs|postcss.config.mjs]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 60 edges
2. `getUser()` - 32 edges
3. `Design System — Indústria 24h` - 26 edges
4. `getMinhaLoja()` - 24 edges
5. `ErrorState()` - 17 edges
6. `compilerOptions` - 16 edges
7. `PrecisaLogin()` - 12 edges
8. `formatBRL()` - 11 edges
9. `Regras de Vibecoding` - 10 edges
10. `PageTitle()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `load()` --references--> `Json`  [EXTRACTED]
  scripts/import-bubble.mjs → src/lib/supabase/database.types.ts
- `importUsers()` --references--> `Json`  [EXTRACTED]
  scripts/import-bubble.mjs → src/lib/supabase/database.types.ts
- `validar()` --references--> `Json`  [EXTRACTED]
  tools/design-loop/build-graph.ts → src/lib/supabase/database.types.ts
- `rest()` --references--> `Json`  [EXTRACTED]
  scripts/import-bubble.mjs → src/lib/supabase/database.types.ts
- `CategoriasPage()` --calls--> `createClient()`  [EXTRACTED]
  src/app/(admin)/admin/categorias/page.tsx → src/lib/supabase/server.ts

## Import Cycles
- None detected.

## Communities (45 total, 14 thin omitted)

### Community 0 - "Design System — Indústria 24h"
Cohesion: 0.07
Nodes (27): Banners e primeira dobra, Card de Produto — hierarquia e estados, Carregamento, Checkout mobile — retenção de benefício, Comportamento de produtos (cobertura regional), Confiança do vendedor, Contexto do Produto, Cor — OFICIAL "Vermelho & Roxo" (+19 more)

### Community 1 - "graph.ts"
Cohesion: 0.13
Nodes (20): app, DESIGN_MD, makeModel(), MODEL_DEFAULTS, propor(), State, validar(), GenerationTrace (+12 more)

### Community 2 - "package.json"
Cohesion: 0.20
Nodes (9): dependencies, @langchain/anthropic, @langchain/core, @langchain/langgraph, name, private, scripts, start (+1 more)

### Community 3 - "run.ts"
Cohesion: 0.17
Nodes (34): gerarIdentificador(), solicitarAfiliacao(), AfiliadoLayout(), AfiliadoPage(), SolicitarAfiliacaoPage(), GET(), moderarAfiliacao(), AfiliadosPage() (+26 more)

### Community 4 - "dependencies"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 5 - "ui.tsx"
Cohesion: 0.07
Nodes (28): adminRows, DATA, env, idVendaVistos, imgRows, importUsers(), itemById, itemRows (+20 more)

### Community 6 - "database.types.ts"
Cohesion: 0.08
Nodes (22): CentroFormState, criarCentro(), LojaFormState, salvarLoja(), criarProduto(), num(), ProdutoFormState, CentroForm() (+14 more)

### Community 7 - "page.tsx"
Cohesion: 0.08
Nodes (25): dependencies, @modelcontextprotocol/sdk, next, react, react-dom, @sentry/nextjs, @supabase/ssr, @supabase/supabase-js (+17 more)

### Community 10 - "layout.tsx"
Cohesion: 0.16
Nodes (13): buildApp, DESIGN_MD, HERE, makeModel(), PROIBIDAS_GLOBAIS, propor(), Spec, State (+5 more)

### Community 12 - "layout.tsx"
Cohesion: 0.40
Nodes (3): geist, instrumentSans, metadata

### Community 13 - "layout.tsx"
Cohesion: 0.50
Nodes (3): SellerLayout(), ITENS, Sidebar()

### Community 16 - "package.json"
Cohesion: 0.11
Nodes (17): bin, industria24h-mcp, dependencies, @modelcontextprotocol/sdk, @supabase/supabase-js, zod, devDependencies, @types/node (+9 more)

### Community 17 - "ui.tsx"
Cohesion: 0.23
Nodes (7): Faixa, Loja, LojaCard(), Produto, ProdutoCard(), VitrineFooter(), VitrineHeader()

### Community 18 - "page.tsx"
Cohesion: 0.09
Nodes (22): Acesso, AcessosPage(), criarCategoria(), criarSubcategoria(), excluirCategoria(), excluirSubcategoria(), CategoriasPage(), salvarMarketplaceConfig() (+14 more)

### Community 19 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, esModuleInterop, module, moduleResolution, outDir, rootDir, skipLibCheck, strict (+2 more)

### Community 20 - "industria24h-mcp"
Cohesion: 0.33
Nodes (5): industria24h-mcp, Registrar em um cliente MCP (ex: Claude Desktop `claude_desktop_config.json`), Rodar, Setup, Tools expostos

### Community 21 - "index.ts"
Cohesion: 0.33
Nodes (5): server, supabase, tableEnum, TABLES, transport

### Community 30 - "actions.ts"
Cohesion: 0.47
Nodes (3): setSituacaoLoja(), Situacao, SITUACOES

### Community 35 - "web — Fundação Industria24h"
Cohesion: 0.40
Nodes (4): Estado atual (fundação), Próximo (bloqueado até schema real), Setup, web — Fundação Industria24h

### Community 36 - "AGENTS.md"
Cohesion: 0.13
Nodes (14): 1. Dados e Backend — PROIBIDO mockar, 2. Nunca invente schema, 3. Segredos e credenciais, 4. Docs primeiro, docs atualizados, 5. Módulo Consignado — escopo separado, 6. Qualidade e commits, 7. Identidade Git, 8. RLS e segurança por padrão (+6 more)

## Knowledge Gaps
- **182 isolated node(s):** `This is NOT the Next.js you know`, `O Projeto`, `1. Dados e Backend — PROIBIDO mockar`, `2. Nunca invente schema`, `3. Segredos e credenciais` (+177 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Json` connect `ui.tsx` to `database.types.ts`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `createClient()` connect `run.ts` to `page.tsx`, `database.types.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `validar()` connect `ui.tsx` to `layout.tsx`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `This is NOT the Next.js you know`, `O Projeto`, `1. Dados e Backend — PROIBIDO mockar` to the rest of the system?**
  _183 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Design System — Indústria 24h` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `graph.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13230769230769232 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._