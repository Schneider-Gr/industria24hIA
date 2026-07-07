# Graph Report - .  (2026-07-07)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 332 nodes · 755 edges · 30 communities (17 shown, 13 thin omitted)
- Extraction: 96% EXTRACTED · 3% INFERRED · 1% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.77)
- Token cost: 51,650 input · 461 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Páginas Admin e Afiliados|Páginas Admin e Afiliados]]
- [[_COMMUNITY_Ações de Loja e Categorias|Ações de Loja e Categorias]]
- [[_COMMUNITY_Arquitetura e Migração Bubble|Arquitetura e Migração Bubble]]
- [[_COMMUNITY_Formulários de Cadastro|Formulários de Cadastro]]
- [[_COMMUNITY_Documentação Resumida do Sistema|Documentação Resumida do Sistema]]
- [[_COMMUNITY_Dependências do Projeto|Dependências do Projeto]]
- [[_COMMUNITY_Modelo de Comissões e Pagamentos|Modelo de Comissões e Pagamentos]]
- [[_COMMUNITY_Configuração TypeScript|Configuração TypeScript]]
- [[_COMMUNITY_Schema Especulativo E-commerce|Schema Especulativo E-commerce]]
- [[_COMMUNITY_Moderação de Situação de Loja|Moderação de Situação de Loja]]
- [[_COMMUNITY_Moderação de Status de Produto|Moderação de Status de Produto]]
- [[_COMMUNITY_Agente Coder LangGraph|Agente Coder LangGraph]]
- [[_COMMUNITY_Layout Raiz do App|Layout Raiz do App]]
- [[_COMMUNITY_Documento Mestre Industria24h|Documento Mestre Industria24h]]
- [[_COMMUNITY_Busca Vetorial CRM|Busca Vetorial CRM]]
- [[_COMMUNITY_Guias LangChain e LangGraph|Guias LangChain e LangGraph]]
- [[_COMMUNITY_Configuração do Marketplace|Configuração do Marketplace]]
- [[_COMMUNITY_Páginas CMS|Páginas CMS]]
- [[_COMMUNITY_Regras do App Next.js|Regras do App Next.js]]
- [[_COMMUNITY_Configuração ESLint|Configuração ESLint]]
- [[_COMMUNITY_Configuração Next.js|Configuração Next.js]]
- [[_COMMUNITY_Tipos Gerados Next.js|Tipos Gerados Next.js]]
- [[_COMMUNITY_Configuração PostCSS|Configuração PostCSS]]
- [[_COMMUNITY_Spec RAG com pgvector|Spec RAG com pgvector]]
- [[_COMMUNITY_Ícone de Arquivo|Ícone de Arquivo]]
- [[_COMMUNITY_Ícone de Globo|Ícone de Globo]]
- [[_COMMUNITY_Logo Vercel|Logo Vercel]]
- [[_COMMUNITY_Ícone de Janela|Ícone de Janela]]
- [[_COMMUNITY_README da Vercel|README da Vercel]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 59 edges
2. `getUser()` - 24 edges
3. `Modelo de Dados` - 22 edges
4. `ErrorState()` - 20 edges
5. `getMinhaLoja()` - 20 edges
6. `Modelo de Dados (70+ Data Types Bubble)` - 19 edges
7. `compilerOptions` - 16 edges
8. `PageHeader()` - 13 edges
9. `Plano de Migração` - 12 edges
10. `fmtDate()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Documento Mestre` --conceptually_related_to--> `Industria24h — Engenharia Reversa Completa (PDF)`  [AMBIGUOUS]
  Industria24/00-master.md → Industria24h - Engenharia Reversa Completa.pdf
- `Schema especulativo Industria24hs` --semantically_similar_to--> `User (Bubble meta schema)`  [AMBIGUOUS] [semantically similar]
  Industria24/bubble-export/_especulativo/schema_banco-bubble.md → Industria24/schema_banco-bubble.md
- `README` --conceptually_related_to--> `Documento Mestre`  [AMBIGUOUS]
  README.md → Industria24/00-master.md
- `Banner 'Compre do Mercado Futuro' (homem com camiseta Indústria24h, CTA Saiba Mais)` --conceptually_related_to--> `Regras de Negócio`  [INFERRED]
  Industria24/web/public/banners/banner-mercado-futuro.png → Industria24/docs/business-rules.md
- `Arquitetura Alvo (Next.js + Supabase + Vercel)` --semantically_similar_to--> `Arquitetura (resumo)`  [INFERRED] [semantically similar]
  Industria24/architecture.md → Industria24/01-arquitetura.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Corpo documental da migração Bubble → Supabase** — industria24_claude_doc, industria24_architecture_doc, industria24_database_doc, industria24_privacy_rules_doc, industria24_migration_doc, industria24_backend_workflows_doc, industria24_api_connector_doc, industria24_integrations_doc, industria24_business_rules_doc, industria24_pages_doc [EXTRACTED 0.90]
- **Loop gerar→testar→corrigir do agente LangGraph** — industria24_langgraph_agentstate, industria24_langgraph_generate_code_node, industria24_langgraph_execute_test_node, industria24_langgraph_router_decision, industria24_langgraph_coder_agent [EXTRACTED 0.95]
- **Pipeline RAG do CRM (pgvector no Supabase)** — industria24_claude_preciso_que_voce_crie_a_arq_crm_conhecimento, industria24_claude_preciso_que_voce_crie_a_arq_match_crm_conhecimento, industria24_claude_preciso_que_voce_crie_a_arq_buscar_contexto_crm [EXTRACTED 0.90]
- **Sistema de payouts de contribuidores (Bubble meta)** — industria24_schema_banco_bubble_contributorpayout, industria24_schema_banco_bubble_plugincommissionpayout, industria24_schema_banco_bubble_templatecommissionpayout, industria24_schema_banco_bubble_coachingcommissionpayout, industria24_schema_banco_bubble_affiliatecommissionpayout [EXTRACTED 0.85]
- **Fluxo de bootcamp (sessões e tickets)** — industria24_schema_banco_bubble_bootcamp, industria24_schema_banco_bubble_bootcampsession, industria24_schema_banco_bubble_bootcampticket [EXTRACTED 0.90]
- **Documentação de engenharia reversa Industria24hs** — industria24_workflows, industria24_bubble_export__especulativo_readme, industria24_bubble_export_data_types_extracao_2026_07, industria24_docs_admin_module [INFERRED 0.75]
- **Fluxo do dinheiro: carrinho → checkout → pagamento → pedido → repasse** — industria24_docs_business_rules, industria24_docs_workflows, industria24_docs_backend_workflows, industria24_docs_backlog, industria24_docs_database_pedidosvendedor, industria24_docs_database_item_para_compra [EXTRACTED 0.90]
- **Módulo Consignado — segundo sistema dentro do app Bubble** — industria24_docs_consignado_module, industria24_docs_database, industria24_docs_pages, industria24_docs_privacy_rules, industria24_docs_migration [EXTRACTED 0.85]
- **Banners reais da vitrine preservados no rebuild** — industria24_web_design, industria24_web_public_banners_banner_principal, industria24_web_public_banners_banner_mercado_futuro, industria24_web_public_banners_banner_3, industria24_web_public_banners_banner_3_mobile [EXTRACTED 0.90]

## Communities (30 total, 13 thin omitted)

### Community 0 - "Páginas Admin e Afiliados"
Cohesion: 0.12
Nodes (34): Acesso, TODO: requer policy is_admin para escrita cross-seller em afiliacoes., setStatusAfiliacao(), TODO: requer policy is_admin (leitura cross-seller de afiliacoes)., EntregasPage(), TODO: modelar tabela de entregas/fulfillment dedicada + policy is_admin., LojasPage(), TODO: requer policy is_admin (hoje a RLS escopa por owner_id). (+26 more)

### Community 1 - "Ações de Loja e Categorias"
Cohesion: 0.11
Nodes (32): AcessosPage(), AfiliadosPage(), AnaliseGeralPage(), count(), criarCategoria(), criarSubcategoria(), excluirCategoria(), excluirSubcategoria() (+24 more)

### Community 2 - "Arquitetura e Migração Bubble"
Cohesion: 0.15
Nodes (36): Bubble Data API (nativa), API Connector & Configuração de API, Arquitetura — Industria24h, Backend Workflows (Rascunho Inferido), Backlog priorizado por valor, Regras de Negócio, Módulo Consignado, Reconciliação Data API ↔ schema Supabase (+28 more)

### Community 3 - "Formulários de Cadastro"
Cohesion: 0.10
Nodes (18): CentroFormState, criarCentro(), LojaFormState, salvarLoja(), criarProduto(), num(), ProdutoFormState, CentroForm() (+10 more)

### Community 4 - "Documentação Resumida do Sistema"
Cohesion: 0.16
Nodes (29): Arquitetura (resumo), Regras de Negócio (resumo), Data Types (resumo), Workflows (resumo), Pages (resumo), Migração Supabase (resumo), Prisma Schema (resumo), RLS Policies (resumo) (+21 more)

### Community 5 - "Dependências do Projeto"
Cohesion: 0.08
Nodes (24): dependencies, next, react, react-dom, @supabase/ssr, @supabase/supabase-js, devDependencies, eslint (+16 more)

### Community 6 - "Modelo de Comissões e Pagamentos"
Cohesion: 0.14
Nodes (20): Affiliate Commission Payout, Bootcamp, Bootcamp Session, Bootcamp Ticket, Coaching Commission Payout, Coaching Session, Contributor Payout, Invoice (+12 more)

### Community 7 - "Configuração TypeScript"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Schema Especulativo E-commerce"
Cohesion: 0.19
Nodes (14): Alerta _especulativo (README), Schema especulativo Industria24hs, Cotacao (especulativo), Empresa (especulativo), ItemPedido (especulativo), Pedido (especulativo), Produto (especulativo), Extração confirmada Bubble 2026-07 (fonte de verdade) (+6 more)

### Community 9 - "Moderação de Situação de Loja"
Cohesion: 0.38
Nodes (5): TODO: requer policy is_admin, setSituacaoLoja(), Situacao, SITUACOES, ModerarSituacaoLoja()

### Community 10 - "Moderação de Status de Produto"
Cohesion: 0.47
Nodes (4): TODO: requer policy is_admin (RLS atual escopa por dono da loja)., setStatusProduto(), STATUS, ModerarStatusProduto()

### Community 11 - "Agente Coder LangGraph"
Cohesion: 0.60
Nodes (5): AgentState (TypedDict), coder_agent (StateGraph compilado), execute_test_node, generate_code_node, router_decision

### Community 12 - "Layout Raiz do App"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 13 - "Documento Mestre Industria24h"
Cohesion: 0.67
Nodes (3): Documento Mestre, Industria24h — Engenharia Reversa Completa (PDF), README

### Community 14 - "Busca Vetorial CRM"
Cohesion: 0.67
Nodes (3): Função buscar_contexto_crm, Tabela crm_conhecimento (pgvector), RPC match_crm_conhecimento

### Community 15 - "Guias LangChain e LangGraph"
Cohesion: 0.67
Nodes (3): langchain.md (cópia do LangGraph.txt), LangGraph — agente coder com loop de testes, Guia LangChain com Claude Code

## Ambiguous Edges - Review These
- `README` → `Documento Mestre`  [AMBIGUOUS]
  README.md · relation: conceptually_related_to
- `Industria24h — Engenharia Reversa Completa (PDF)` → `Documento Mestre`  [AMBIGUOUS]
  Industria24/00-master.md · relation: conceptually_related_to
- `Documentação Completa do App Bubble (extração real)` → `Schema/Endpoints internos Bubble (dump JSON)`  [AMBIGUOUS]
  Industria24/schema_banco-bubble.md · relation: conceptually_related_to
- `User (Bubble meta schema)` → `Schema especulativo Industria24hs`  [AMBIGUOUS]
  Industria24/bubble-export/_especulativo/README.md · relation: semantically_similar_to
- `Pedido (especulativo)` → `Cotacao (especulativo)`  [AMBIGUOUS]
  Industria24/bubble-export/_especulativo/schema_banco-bubble.md · relation: references
- `Pedido (especulativo)` → `ItemPedido (especulativo)`  [AMBIGUOUS]
  Industria24/bubble-export/_especulativo/schema_banco-bubble.md · relation: references
- `ItemPedido (especulativo)` → `Produto (especulativo)`  [AMBIGUOUS]
  Industria24/bubble-export/_especulativo/schema_banco-bubble.md · relation: references
- `Produto (especulativo)` → `Empresa (especulativo)`  [AMBIGUOUS]
  Industria24/bubble-export/_especulativo/schema_banco-bubble.md · relation: references
- `Produto (especulativo)` → `Produto_ecommerce`  [AMBIGUOUS]
  Industria24/bubble-export/_especulativo/README.md · relation: semantically_similar_to
- `Empresa (especulativo)` → `Loja_ecommerce`  [AMBIGUOUS]
  Industria24/bubble-export/_especulativo/README.md · relation: semantically_similar_to
- `Integração PagBank/PagSeguro (pagamentos)` → `Integração Asaas (PIX/repasse)`  [AMBIGUOUS]
  Industria24/docs/integrations.md · relation: conceptually_related_to

## Knowledge Gaps
- **86 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+81 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `README` and `Documento Mestre`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Industria24h — Engenharia Reversa Completa (PDF)` and `Documento Mestre`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Documentação Completa do App Bubble (extração real)` and `Schema/Endpoints internos Bubble (dump JSON)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `User (Bubble meta schema)` and `Schema especulativo Industria24hs`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Pedido (especulativo)` and `Cotacao (especulativo)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Pedido (especulativo)` and `ItemPedido (especulativo)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `ItemPedido (especulativo)` and `Produto (especulativo)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._