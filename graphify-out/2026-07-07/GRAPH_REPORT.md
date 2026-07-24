# Graph Report - web  (2026-07-07)

## Corpus Check
- 97 files · ~101,864 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 353 nodes · 840 edges · 22 communities (18 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `702c458e`
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
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_actions.ts|actions.ts]]
- [[_COMMUNITY_web — Fundação Industria24h|web — Fundação Industria24h]]
- [[_COMMUNITY_AGENTS|AGENTS.md]]
- [[_COMMUNITY_eslint.config.mjs|eslint.config.mjs]]
- [[_COMMUNITY_next.config.ts|next.config.ts]]
- [[_COMMUNITY_postcss.config.mjs|postcss.config.mjs]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 96 edges
2. `getUser()` - 36 edges
3. `ErrorState()` - 28 edges
4. `getMinhaLoja()` - 26 edges
5. `compilerOptions` - 16 edges
6. `formatBRL()` - 15 edges
7. `PageHeader()` - 14 edges
8. `EmptyState()` - 13 edges
9. `PrecisaLogin()` - 13 edges
10. `fmtDate()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `load()` --references--> `Json`  [EXTRACTED]
  scripts/import-bubble.mjs → src/lib/supabase/database.types.ts
- `importUsers()` --references--> `Json`  [EXTRACTED]
  scripts/import-bubble.mjs → src/lib/supabase/database.types.ts
- `validar()` --references--> `Json`  [EXTRACTED]
  tools/design-loop/build-graph.ts → src/lib/supabase/database.types.ts
- `traceGeneration()` --references--> `Json`  [EXTRACTED]
  tools/design-loop/langfuse.ts → src/lib/supabase/database.types.ts
- `rest()` --references--> `Json`  [EXTRACTED]
  scripts/import-bubble.mjs → src/lib/supabase/database.types.ts

## Import Cycles
- None detected.

## Communities (22 total, 4 thin omitted)

### Community 0 - "Design System — Indústria 24h"
Cohesion: 0.18
Nodes (10): Contexto do Produto, Cor (herdada da marca no ar — industria24h.com.br), Decisões, Design System — Indústria 24h, Direção Estética, Espaçamento, Layout, Moção (+2 more)

### Community 1 - "graph.ts"
Cohesion: 0.16
Nodes (13): app, DESIGN_MD, makeModel(), propor(), State, validar(), GenerationTrace, getPrompt() (+5 more)

### Community 2 - "package.json"
Cohesion: 0.20
Nodes (9): dependencies, @langchain/anthropic, @langchain/core, @langchain/langgraph, name, private, scripts, start (+1 more)

### Community 3 - "run.ts"
Cohesion: 0.18
Nodes (29): gerarIdentificador(), solicitarAfiliacao(), AfiliadoLayout(), AfiliadoPage(), SolicitarAfiliacaoPage(), AfiliadosPage(), AnaliseGeralPage(), CentrosPage() (+21 more)

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
Nodes (23): dependencies, next, react, react-dom, @supabase/ssr, @supabase/supabase-js, devDependencies, eslint (+15 more)

### Community 8 - "page.tsx"
Cohesion: 0.12
Nodes (28): AfiliadosPage(), TODO: requer policy is_admin (leitura cross-seller de afiliacoes)., AnaliseGeralPage(), count(), EntregasPage(), STATUS, LojasPage(), TODO: requer policy is_admin (hoje a RLS escopa por owner_id). (+20 more)

### Community 9 - "page.tsx"
Cohesion: 0.47
Nodes (4): AdminLayout(), NAV, Sidebar(), isAdmin()

### Community 10 - "layout.tsx"
Cohesion: 0.16
Nodes (13): buildApp, DESIGN_MD, HERE, makeModel(), PROIBIDAS_GLOBAIS, propor(), Spec, State (+5 more)

### Community 11 - "page.tsx"
Cohesion: 0.40
Nodes (4): TODO: requer policy is_admin (RLS atual escopa por dono da loja)., setStatusProduto(), STATUS, ModerarStatusProduto()

### Community 12 - "layout.tsx"
Cohesion: 0.40
Nodes (3): geist, instrumentSans, metadata

### Community 13 - "layout.tsx"
Cohesion: 0.50
Nodes (3): SellerLayout(), ITENS, Sidebar()

### Community 18 - "page.tsx"
Cohesion: 0.09
Nodes (32): Acesso, AcessosPage(), TODO: requer policy is_admin para escrita cross-seller em afiliacoes., setStatusAfiliacao(), criarCategoria(), criarSubcategoria(), excluirCategoria(), excluirSubcategoria() (+24 more)

### Community 30 - "actions.ts"
Cohesion: 0.47
Nodes (4): TODO: requer policy is_admin, setSituacaoLoja(), Situacao, SITUACOES

### Community 35 - "web — Fundação Industria24h"
Cohesion: 0.40
Nodes (4): Estado atual (fundação), Próximo (bloqueado até schema real), Setup, web — Fundação Industria24h

## Knowledge Gaps
- **119 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+114 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Json` connect `ui.tsx` to `graph.ts`, `database.types.ts`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **Why does `createClient()` connect `page.tsx` to `run.ts`, `database.types.ts`, `page.tsx`, `page.tsx`, `page.tsx`, `actions.ts`?**
  _High betweenness centrality (0.196) - this node is a cross-community bridge._
- **Why does `traceGeneration()` connect `graph.ts` to `ui.tsx`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _130 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `ui.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06628787878787878 - nodes in this community are weakly interconnected._
- **Should `database.types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07827260458839407 - nodes in this community are weakly interconnected._