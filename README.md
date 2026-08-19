# industria24.com.br — Marketplace industrial

Marketplace B2B/B2C de materiais para construção e indústria, publicado em
**industria24.com.br**. Reconstrução em Next.js + Supabase do portal legado
`industria24h.com.br` (Bubble.io) — os dois domínios não são intercambiáveis;
este repositório cobre apenas o novo (`industria24.com.br`, sem "h").

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict) + **Tailwind CSS 4**
- **Supabase** (Postgres + Auth + Storage) via `@supabase/ssr`
- **Sentry** para observabilidade de erros (`@sentry/nextjs`)
- **Vitest** para testes unitários de regra de negócio
- Agentes de IA via `@anthropic-ai/sdk`, `openai` e `@langchain/langgraph` (bot de
  atendimento, curadoria de anúncio, orquestração com estado)

## Setup

```bash
npm install
cp .env.example .env.local   # preencher com credenciais de Supabase e integrações
npm run dev
```

```bash
npm run build   # build de produção
npm run start   # roda o build
npm run lint     # eslint
npm run test     # testes (Vitest)
```

Sem `.env.local` preenchido, rotas que dependem de dados reais caem num estado
de erro explícito — o projeto não usa dados mockados como fallback visual.

## Arquitetura

`src/app/` usa route groups do App Router para separar áreas por papel de
usuário: `(admin)`, `(seller)`, `(afiliado)`, `(parceiro)`. As rotas públicas
do marketplace (vitrine, produto, loja, carrinho, checkout, pedido, coletiva,
leilão, corridas) ficam soltas na raiz de `src/app/`. Cada área tem seus
componentes espelhados em `src/components/<area>/`.

Regras de negócio (preço por faixa, compra coletiva, disputas, repasse,
geolocalização/frete) vivem como funções puras testáveis em `src/lib/*.ts`,
separadas de componentes e route handlers. Integrações externas — pagamentos
(Asaas), entrega sob demanda (Uber Direct) e WhatsApp Business (Meta) — são
encapsuladas em módulos próprios dentro de `src/lib/`.

`mcp-server/` é um sub-pacote Node independente que expõe uma API para
integrações de terceiros.

## Módulos

**Marketplace core** — vitrine com filtro por CEP, busca, página de produto e
loja, carrinho multiloja, checkout com PIX (Asaas), acompanhamento de pedido e
confirmação de entrega por código.

**Painel do vendedor (seller)** — cadastro de produtos e promoções, gestão de
pedidos e disputas, analytics de loja, campanhas de anúncios internos, gestão
de crédito/reputação, roteirização de entregas e centros de distribuição.

**Painel administrativo (admin)** — curadoria de produtos e lojas, moderação
de anúncios, gestão de categorias/galerias/páginas, auditoria, análise geral
da operação, gestão de repasses, transportadoras, parceiros logísticos e
incidentes.

**Afiliados e logística** — programa de afiliados com comissão por indicação,
afiliado logístico (percurso e produto vinculados a entrega), painel de
solicitação e acompanhamento.

**Parceiro logístico / entregador** — cadastro e aceite de termos, check-in
com geolocalização (GPS), corridas e roteirização, mobilidade sob demanda.

**Compra coletiva e leilão reverso** — compra coletiva com preço decrescente
por lote, leilão reverso entre fornecedores, venda futura com desconto
progressivo.

**Pós-venda e disputas** — workflow de disputas com mediação, upload de
evidências, prazos de SLA.

**Bot de atendimento e IA** — atendimento multi-persona via WhatsApp/chat,
curadoria de anúncio assistida por IA, agentes orquestrados com LangGraph.

**Observabilidade** — painel interno de métricas de operação, monitoramento de
cron jobs e captura de erros via Sentry.

## Documentação

Especificações funcionais completas (PRDs) vivem em `docs/prds/` e
`docs/prd/` — cada módulo listado acima tem um ou mais documentos
correspondentes ali, incluindo diagramas de processo (BPMN) para os fluxos
mais complexos (frete, corridas, parceiro logístico).

O histórico de decisões de schema (120+ migrations em `supabase/migrations/`)
reflete a evolução incremental do banco a partir da migração do sistema
legado.
