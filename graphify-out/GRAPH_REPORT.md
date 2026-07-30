# Graph Report - gap-analysis  (2026-07-21)

## Corpus Check
- 265 files · ~184,822 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 862 nodes · 2163 edges · 50 communities (43 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 48 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `066cd05b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_createClient|createClient]]
- [[_COMMUNITY_getUser|getUser]]
- [[_COMMUNITY_ui.tsx|ui.tsx]]
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
- [[_COMMUNITY_page.tsx|page.tsx]]
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
- [[_COMMUNITY_aceite-termos.test.ts|aceite-termos.test.ts]]
- [[_COMMUNITY_AGENTS|AGENTS.md]]
- [[_COMMUNITY_eslint.config.mjs|eslint.config.mjs]]
- [[_COMMUNITY_next.config.ts|next.config.ts]]
- [[_COMMUNITY_postcss.config.mjs|postcss.config.mjs]]
- [[_COMMUNITY_cep.ts|cep.ts]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_server.ts|server.ts]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_AfiliadoSidebar.tsx|AfiliadoSidebar.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 176 edges
2. `getUser()` - 68 edges
3. `formatBRL()` - 47 edges
4. `getMinhaLoja()` - 44 edges
5. `ErrorState()` - 38 edges
6. `PrecisaLogin()` - 24 edges
7. `EmptyState()` - 22 edges
8. `PageTitle()` - 22 edges
9. `StatusBadge()` - 21 edges
10. `isAdmin()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `buildServer()` --indirect_call--> `count()`  [INFERRED]
  mcp-server/src/server.ts → src/app/(admin)/admin/analise-geral/page.tsx
- `ok()` --references--> `Json`  [EXTRACTED]
  mcp-server/src/server.ts → src/lib/supabase/database.types.ts
- `load()` --references--> `Json`  [EXTRACTED]
  scripts/import-bubble.mjs → src/lib/supabase/database.types.ts
- `importUsers()` --references--> `Json`  [EXTRACTED]
  scripts/import-bubble.mjs → src/lib/supabase/database.types.ts
- `validar()` --references--> `Json`  [EXTRACTED]
  tools/design-loop/build-graph.ts → src/lib/supabase/database.types.ts

## Import Cycles
- None detected.

## Communities (50 total, 7 thin omitted)

### Community 0 - "createClient"
Cohesion: 0.21
Nodes (19): LojasPage(), AdminDashboard(), monthStartISO(), PedidosPage(), ProdutosPage(), PromocoesPage(), AdminUsuariosPage(), BADGE (+11 more)

### Community 1 - "getUser"
Cohesion: 0.09
Nodes (55): Afiliacao, AfiliadoLogisticaPage(), Entrega, LinhaItem, Pedido, STATUS_FORA, AfiliadoPage(), Corrida (+47 more)

### Community 2 - "ui.tsx"
Cohesion: 0.11
Nodes (18): Ordenacao, CARDS_GALERIA, BannerCarousel(), BannerSlide, BannerGalerias(), CardGaleria, Categoria, MegaMenuCategorias() (+10 more)

### Community 3 - "actions.ts"
Cohesion: 0.08
Nodes (23): GET(), CheckoutState, criarCobrancaPedido(), finalizarCompra(), gerarCobranca(), CheckoutPage(), PedidoPage(), CONTAS (+15 more)

### Community 4 - "Sidebar.tsx"
Cohesion: 0.10
Nodes (4): base, GRUPOS, IconProps, SidebarProps

### Community 5 - "page.tsx"
Cohesion: 0.09
Nodes (30): Corrida, despacharCorridaParaPedido(), EVENTOS_CANCELADO, EVENTOS_PAGO, MaybeSingleResult, ParceiroLogistico, POST(), RpcResult (+22 more)

### Community 6 - "import-bubble.mjs"
Cohesion: 0.06
Nodes (36): adminRows, DATA, env, idVendaVistos, imgRows, importUsers(), itemById, itemRows (+28 more)

### Community 7 - "actions.ts"
Cohesion: 0.06
Nodes (43): salvarMarketplaceConfig(), EditarMarketplacePage(), CentroFormState, criarCentro(), excluirCentro(), cancelarCredito(), CreditoFormState, solicitarCredito() (+35 more)

### Community 8 - "devDependencies"
Cohesion: 0.08
Nodes (25): dependencies, @anthropic-ai/sdk, next, react, react-dom, @sentry/nextjs, @supabase/ssr, @supabase/supabase-js (+17 more)

### Community 9 - "server.ts"
Cohesion: 0.14
Nodes (19): autenticar(), AuthContext, Escopo, hashToken(), registrarUso(), allowedHosts, app, PORT (+11 more)

### Community 10 - "build-graph.ts"
Cohesion: 0.13
Nodes (17): buildApp, DESIGN_MD, HERE, makeModel(), PROIBIDAS_GLOBAIS, propor(), Spec, State (+9 more)

### Community 11 - "Design System — Indústria 24h"
Cohesion: 0.10
Nodes (19): Barra de garantias, Card de Produto — hierarquia e estados, Comportamento de produtos (cards e listagem), Confiança do vendedor, Contexto do Produto, Cor — identidade "Aço & Sinal" (OFICIAL desde 2026-07-16, confirmada pelo dono em 2026-07-19), Decisões, Design System — Indústria 24h (+11 more)

### Community 12 - "package.json"
Cohesion: 0.10
Nodes (19): bin, industria24-mcp-server, dependencies, express, @modelcontextprotocol/sdk, @supabase/supabase-js, zod, devDependencies (+11 more)

### Community 13 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 14 - "page.tsx"
Cohesion: 0.17
Nodes (17): aceitarCorrida(), alterarChavePixParceiro(), atualizarStatusCorrida(), atualizarStatusRota(), darLanceCorrida(), db(), salvarCadastroParceiro(), versaoTermosVigente() (+9 more)

### Community 15 - "SkeletonPagina.tsx"
Cohesion: 0.19
Nodes (3): SkeletonPagina(), SkeletonGradeProdutos(), SkeletonTituloSecao()

### Community 16 - "page.tsx"
Cohesion: 0.12
Nodes (20): setStatusAfiliacao(), setSituacaoLoja(), Situacao, SITUACOES, setStatusProduto(), STATUS, anexarImagemProdutoAdmin(), Decisao (+12 more)

### Community 17 - "graph.ts"
Cohesion: 0.19
Nodes (9): app, DESIGN_MD, makeModel(), propor(), State, validar(), alvos, WEB (+1 more)

### Community 18 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, declaration, esModuleInterop, module, moduleResolution, outDir, rootDir, skipLibCheck (+3 more)

### Community 19 - "LojaForm.tsx"
Cohesion: 0.16
Nodes (19): Acesso, AcessosPage(), AfiliadosPage(), criarCategoria(), criarSubcategoria(), excluirCategoria(), excluirSubcategoria(), exigirAdmin() (+11 more)

### Community 20 - "database.types.ts"
Cohesion: 0.26
Nodes (7): GET(), TermosPage(), Database, SUPABASE_ANON_KEY, SUPABASE_URL, createPublicClient(), SERVICE_KEY

### Community 21 - "industria24-mcp-server"
Cohesion: 0.20
Nodes (9): Arquitetura, Emitir uma chave para um parceiro (admin), industria24-mcp-server, Registrar no cliente MCP, Segurança, Setup, Testar localmente, Tools (+1 more)

### Community 22 - "actions.ts"
Cohesion: 0.17
Nodes (12): metadata, metadata, metadata, metadata, metadata, Bloco(), Cod(), NavDocs() (+4 more)

### Community 23 - "package.json"
Cohesion: 0.20
Nodes (9): dependencies, @langchain/anthropic, @langchain/core, @langchain/langgraph, name, private, scripts, start (+1 more)

### Community 24 - "layout.tsx"
Cohesion: 0.10
Nodes (7): AdminLayout(), AdminShell(), AdminShellProps, GRUPOS, Sidebar(), SidebarProps, svg

### Community 25 - "client.ts"
Cohesion: 0.15
Nodes (12): CarrinhoPage(), archivo, inter, metadata, LimparCarrinhoAoMontar(), BotaoAddCarrinho(), CarrinhoBadge(), CarrinhoContext (+4 more)

### Community 26 - "actions.ts"
Cohesion: 0.43
Nodes (5): AdsFormState, patrocinarProduto(), pausarPatrocinio(), reativarPatrocinio(), AdsForm()

### Community 27 - "verify-loja-mapping.mjs"
Cohesion: 0.33
Nodes (4): itensRaw, lojaMap, lojasRaw, [semLoja, doUserA, viaItem]

### Community 29 - "actions.ts"
Cohesion: 0.16
Nodes (9): SECOES, SellerShellProps, Sidebar(), PASSOS, TourContext, TourContextValue, TourProvider(), TourTrigger() (+1 more)

### Community 30 - "actions.ts"
Cohesion: 0.27
Nodes (9): AfiliadoLayout(), SellerLayout(), SellerShell(), aceitarTermos(), TERMOS_AFILIADO, TERMOS_SELLER, termosPendentes(), DocumentoTermos (+1 more)

### Community 31 - "emitir-token.mjs"
Cohesion: 0.50
Nodes (4): gerar(), hashToken(), partnerIdx, { token, prefixo, hash }

### Community 32 - "web — Fundação Industria24h"
Cohesion: 0.40
Nodes (4): Estado atual (fundação), Próximo (bloqueado até schema real), Setup, web — Fundação Industria24h

### Community 41 - "cep.ts"
Cohesion: 0.30
Nodes (9): definirCepComprador(), limparCepComprador(), CepBar(), lerEnderecoDoBrowser(), PortaoCep(), buscarEndereco(), EnderecoCep, formatarCep() (+1 more)

### Community 42 - "page.tsx"
Cohesion: 0.23
Nodes (9): Faixa, CapturaRef(), GaleriaProduto(), ImagemProduto, formatDataCurta(), formatDataCurtaAno(), MercadoFuturo(), VendaFuturaItem (+1 more)

### Community 43 - "server.ts"
Cohesion: 0.27
Nodes (6): atualizarEntrega(), EntregasPage(), STATUS, excluirPagina(), salvarPagina(), PaginasPage()

### Community 44 - "page.tsx"
Cohesion: 0.38
Nodes (9): BuscaPage(), CategoriaPage(), LojaPage(), HomePage(), ProdutoPage(), limparBBCode(), lerEnderecoCookie(), lojaCobreCep() (+1 more)

### Community 45 - "AfiliadoSidebar.tsx"
Cohesion: 0.22
Nodes (4): AfiliadoShell(), AfiliadoSidebar(), ITENS, svg

### Community 46 - "page.tsx"
Cohesion: 0.39
Nodes (6): gerarIdentificador(), solicitarAfiliacao(), solicitarAfiliacaoLoja(), TERMOS_SLUG, versaoTermosVigente(), SolicitarAfiliacaoPage()

### Community 47 - "page.tsx"
Cohesion: 0.33
Nodes (7): adjudicarLeilao(), darLanceLeilao(), db(), publicarLeilao(), Categoria, Leilao, LeilaoPage()

### Community 48 - "page.tsx"
Cohesion: 0.50
Nodes (3): moderarParceiro(), AdminParceirosPage(), Parceiro

## Knowledge Gaps
- **257 isolated node(s):** `eslintConfig`, `name`, `version`, `private`, `type` (+252 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `LojaForm.tsx` to `createClient`, `getUser`, `ui.tsx`, `actions.ts`, `page.tsx`, `import-bubble.mjs`, `actions.ts`, `page.tsx`, `page.tsx`, `layout.tsx`, `client.ts`, `actions.ts`, `actions.ts`, `actions.ts`, `server.ts`, `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **Why does `Json` connect `import-bubble.mjs` to `getUser`, `actions.ts`, `page.tsx`, `actions.ts`, `server.ts`, `cep.ts`, `page.tsx`, `page.tsx`, `client.ts`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `validar()` connect `import-bubble.mjs` to `build-graph.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `name`, `version` to the rest of the system?**
  _257 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getUser` be split into smaller, more focused modules?**
  _Cohesion score 0.09302325581395349 - nodes in this community are weakly interconnected._
- **Should `ui.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11397849462365592 - nodes in this community are weakly interconnected._
- **Should `actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08013937282229965 - nodes in this community are weakly interconnected._