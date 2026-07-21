# Graph Report - gap-analysis  (2026-07-20)

## Corpus Check
- 246 files · ~176,880 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 794 nodes · 2032 edges · 41 communities (34 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d96a011e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_actions.ts|actions.ts]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_aceite-termos.test.ts|aceite-termos.test.ts]]
- [[_COMMUNITY_salvarCadastroParceiro|salvarCadastroParceiro]]
- [[_COMMUNITY_actions.ts|actions.ts]]
- [[_COMMUNITY_Sidebar.tsx|Sidebar.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_import-bubble.mjs|import-bubble.mjs]]
- [[_COMMUNITY_actions.ts|actions.ts]]
- [[_COMMUNITY_devDependencies|devDependencies]]
- [[_COMMUNITY_server.ts|server.ts]]
- [[_COMMUNITY_build-graph.ts|build-graph.ts]]
- [[_COMMUNITY_Design System — Indústria 24h|Design System — Indústria 24h]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_SkeletonPagina.tsx|SkeletonPagina.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_graph.ts|graph.ts]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_LojaForm.tsx|LojaForm.tsx]]
- [[_COMMUNITY_database.types.ts|database.types.ts]]
- [[_COMMUNITY_industria24-mcp-server|industria24-mcp-server]]
- [[_COMMUNITY_actions.ts|actions.ts]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_client.ts|client.ts]]
- [[_COMMUNITY_actions.ts|actions.ts]]
- [[_COMMUNITY_verify-loja-mapping.mjs|verify-loja-mapping.mjs]]
- [[_COMMUNITY_register|register]]
- [[_COMMUNITY_actions.ts|actions.ts]]
- [[_COMMUNITY_actions.ts|actions.ts]]
- [[_COMMUNITY_emitir-token.mjs|emitir-token.mjs]]
- [[_COMMUNITY_web — Fundação Industria24h|web — Fundação Industria24h]]
- [[_COMMUNITY_AGENTS|AGENTS.md]]
- [[_COMMUNITY_eslint.config.mjs|eslint.config.mjs]]
- [[_COMMUNITY_next.config.ts|next.config.ts]]
- [[_COMMUNITY_postcss.config.mjs|postcss.config.mjs]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 169 edges
2. `getUser()` - 68 edges
3. `formatBRL()` - 47 edges
4. `getMinhaLoja()` - 42 edges
5. `ErrorState()` - 38 edges
6. `PrecisaLogin()` - 24 edges
7. `EmptyState()` - 22 edges
8. `PageTitle()` - 22 edges
9. `StatusBadge()` - 20 edges
10. `isAdmin()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `buildServer()` --indirect_call--> `count()`  [INFERRED]
  mcp-server/src/server.ts → src/app/(admin)/admin/analise-geral/page.tsx
- `validar()` --references--> `Json`  [EXTRACTED]
  tools/design-loop/build-graph.ts → src/lib/supabase/database.types.ts
- `ok()` --references--> `Json`  [EXTRACTED]
  mcp-server/src/server.ts → src/lib/supabase/database.types.ts
- `load()` --references--> `Json`  [EXTRACTED]
  scripts/import-bubble.mjs → src/lib/supabase/database.types.ts
- `rest()` --references--> `Json`  [EXTRACTED]
  scripts/import-bubble.mjs → src/lib/supabase/database.types.ts

## Import Cycles
- None detected.

## Communities (41 total, 7 thin omitted)

### Community 0 - "actions.ts"
Cohesion: 0.19
Nodes (16): aceitarCorrida(), alterarChavePixParceiro(), atualizarStatusCorrida(), atualizarStatusRota(), darLanceCorrida(), db(), salvarCadastroParceiro(), versaoTermosVigente() (+8 more)

### Community 1 - "page.tsx"
Cohesion: 0.09
Nodes (56): AfiliadoLayout(), aceitarCorridaAfiliado(), atualizarEntregaLogistica(), atualizarStatusCorridaAfiliado(), atualizarStatusRotaAfiliado(), STATUS_VALIDOS, StatusEntrega, Afiliacao (+48 more)

### Community 2 - "page.tsx"
Cohesion: 0.06
Nodes (77): Acesso, AcessosPage(), setStatusAfiliacao(), AfiliadosPage(), AnaliseGeralPage(), count(), criarCategoria(), criarSubcategoria() (+69 more)

### Community 4 - "salvarCadastroParceiro"
Cohesion: 0.06
Nodes (52): GET(), BuscaPage(), Ordenacao, CategoriaPage(), metadata, LojaPage(), CARDS_GALERIA, HomePage() (+44 more)

### Community 5 - "actions.ts"
Cohesion: 0.08
Nodes (32): importUsers(), load(), CarrinhoPage(), CheckoutState, criarCobrancaPedido(), finalizarCompra(), gerarCobranca(), CheckoutPage() (+24 more)

### Community 6 - "Sidebar.tsx"
Cohesion: 0.06
Nodes (15): SellerLayout(), SECOES, SellerShell(), SellerShellProps, base, GRUPOS, IconProps, Sidebar() (+7 more)

### Community 7 - "page.tsx"
Cohesion: 0.11
Nodes (27): Corrida, despacharCorridaParaPedido(), EVENTOS_CANCELADO, EVENTOS_PAGO, MaybeSingleResult, ParceiroLogistico, POST(), RpcResult (+19 more)

### Community 8 - "import-bubble.mjs"
Cohesion: 0.07
Nodes (24): adminRows, DATA, env, idVendaVistos, imgRows, itemById, itemRows, itensRaw (+16 more)

### Community 9 - "actions.ts"
Cohesion: 0.14
Nodes (21): anexarImagemProduto(), atualizarProduto(), criarProduto(), excluirProduto(), num(), produtoDaMinhaLoja(), ProdutoFormState, salvarValorMinimo() (+13 more)

### Community 10 - "devDependencies"
Cohesion: 0.08
Nodes (25): dependencies, @anthropic-ai/sdk, next, react, react-dom, @sentry/nextjs, @supabase/ssr, @supabase/supabase-js (+17 more)

### Community 11 - "server.ts"
Cohesion: 0.14
Nodes (19): autenticar(), AuthContext, Escopo, hashToken(), registrarUso(), allowedHosts, app, PORT (+11 more)

### Community 12 - "build-graph.ts"
Cohesion: 0.12
Nodes (18): buildApp, DESIGN_MD, HERE, makeModel(), PROIBIDAS_GLOBAIS, propor(), Spec, State (+10 more)

### Community 13 - "Design System — Indústria 24h"
Cohesion: 0.10
Nodes (19): Barra de garantias, Card de Produto — hierarquia e estados, Comportamento de produtos (cards e listagem), Confiança do vendedor, Contexto do Produto, Cor — identidade "Aço & Sinal" (OFICIAL desde 2026-07-16, confirmada pelo dono em 2026-07-19), Decisões, Design System — Indústria 24h (+11 more)

### Community 14 - "package.json"
Cohesion: 0.10
Nodes (19): bin, industria24-mcp-server, dependencies, express, @modelcontextprotocol/sdk, @supabase/supabase-js, zod, devDependencies (+11 more)

### Community 15 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 16 - "SkeletonPagina.tsx"
Cohesion: 0.19
Nodes (3): SkeletonPagina(), SkeletonGradeProdutos(), SkeletonTituloSecao()

### Community 17 - "page.tsx"
Cohesion: 0.23
Nodes (6): GET(), CONTAS, ContasTeste(), FormularioLogin(), LoginModal(), safeNext()

### Community 18 - "graph.ts"
Cohesion: 0.19
Nodes (9): app, DESIGN_MD, makeModel(), propor(), State, validar(), alvos, WEB (+1 more)

### Community 19 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, declaration, esModuleInterop, module, moduleResolution, outDir, rootDir, skipLibCheck (+3 more)

### Community 20 - "LojaForm.tsx"
Cohesion: 0.24
Nodes (7): salvarLoja(), MarketplaceBannerForm(), ImageUpload(), ImageUploadProps, LojaForm(), TIPOS_PIX, UFS

### Community 21 - "database.types.ts"
Cohesion: 0.20
Nodes (8): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, TablesUpdate, SERVICE_KEY

### Community 22 - "industria24-mcp-server"
Cohesion: 0.20
Nodes (9): Arquitetura, Emitir uma chave para um parceiro (admin), industria24-mcp-server, Registrar no cliente MCP, Segurança, Setup, Testar localmente, Tools (+1 more)

### Community 23 - "actions.ts"
Cohesion: 0.27
Nodes (7): alterarChavePix(), ChavePixFormState, LojaFormState, ChavePixForm(), TIPOS_PIX, Tables, TablesInsert

### Community 24 - "package.json"
Cohesion: 0.20
Nodes (9): dependencies, @langchain/anthropic, @langchain/core, @langchain/langgraph, name, private, scripts, start (+1 more)

### Community 25 - "layout.tsx"
Cohesion: 0.28
Nodes (6): AdminLayout(), AdminShell(), AdminShellProps, NAV, Sidebar(), SidebarProps

### Community 27 - "actions.ts"
Cohesion: 0.43
Nodes (5): AdsFormState, patrocinarProduto(), pausarPatrocinio(), reativarPatrocinio(), AdsForm()

### Community 28 - "verify-loja-mapping.mjs"
Cohesion: 0.33
Nodes (4): itensRaw, lojaMap, lojasRaw, [semLoja, doUserA, viaItem]

### Community 30 - "actions.ts"
Cohesion: 0.53
Nodes (4): CentroFormState, criarCentro(), excluirCentro(), CentroForm()

### Community 31 - "actions.ts"
Cohesion: 0.53
Nodes (4): cancelarCredito(), CreditoFormState, solicitarCredito(), CreditoForm()

### Community 32 - "emitir-token.mjs"
Cohesion: 0.50
Nodes (4): gerar(), hashToken(), partnerIdx, { token, prefixo, hash }

### Community 33 - "web — Fundação Industria24h"
Cohesion: 0.40
Nodes (4): Estado atual (fundação), Próximo (bloqueado até schema real), Setup, web — Fundação Industria24h

## Knowledge Gaps
- **246 isolated node(s):** `eslintConfig`, `name`, `version`, `private`, `type` (+241 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `page.tsx` to `actions.ts`, `page.tsx`, `salvarCadastroParceiro`, `actions.ts`, `Sidebar.tsx`, `page.tsx`, `actions.ts`, `page.tsx`, `LojaForm.tsx`, `actions.ts`, `layout.tsx`, `actions.ts`, `actions.ts`, `actions.ts`?**
  _High betweenness centrality (0.232) - this node is a cross-community bridge._
- **Why does `Json` connect `actions.ts` to `page.tsx`, `salvarCadastroParceiro`, `page.tsx`, `import-bubble.mjs`, `actions.ts`, `server.ts`, `build-graph.ts`, `database.types.ts`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **Why does `validar()` connect `build-graph.ts` to `actions.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `name`, `version` to the rest of the system?**
  _246 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0910960916838084 - nodes in this community are weakly interconnected._
- **Should `page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05765609155439664 - nodes in this community are weakly interconnected._
- **Should `salvarCadastroParceiro` be split into smaller, more focused modules?**
  _Cohesion score 0.05818395533352924 - nodes in this community are weakly interconnected._