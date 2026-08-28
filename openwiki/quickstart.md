---
type: quickstart guide
title: Repository Quickstart and Change Routing
description: Start and validate the marketplace, MCP partner service, or operations dashboard from the correct package. Use the routing map to find the authoritative architecture, workflow, integration, operations, and testing context before changing a boundary.
tags: [quickstart, repository, development, validation, change-routing]
verified:
  - by: openwiki/0.4.3
    at: 2026-08-28T11:56:15.901Z
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-ea70eb6c045047448e446296
    resource: repo://.gitignore
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-625e2135e33e3cb47ff6220b
    resource: repo://dashboard-ops/app/page.tsx
  - id: openwiki-source-75f5ac46e6716aeb2ca2446f
    resource: repo://dashboard-ops/next.config.ts
  - id: openwiki-source-b6305f6550d70beb99a71e65
    resource: repo://dashboard-ops/package.json
  - id: openwiki-source-669c6b5d119a0cd3142bce3e
    resource: repo://mcp-server/.env.example
  - id: openwiki-source-54eca42f00a391caed4f9e84
    resource: repo://mcp-server/package.json
  - id: openwiki-source-c373fa2f3980420c295ffe54
    resource: repo://mcp-server/README.md
  - id: openwiki-source-bf1eced407d3838c6eff15ac
    resource: repo://mcp-server/src/app.ts
  - id: openwiki-source-0e7b4af77106f0b1e650c3c7
    resource: repo://mcp-server/src/checkout.ts
  - id: openwiki-source-e5d73928994963dc9694e4dc
    resource: repo://mcp-server/src/http.ts
  - id: openwiki-source-50a18d054b596a7ed0eeffb0
    resource: repo://next.config.ts
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-8d46e58add4326fa55236087
    resource: repo://src/app/layout.tsx
  - id: openwiki-source-f6d061e83261abf20001d210
    resource: repo://supabase/tests/e2e_disputas_mediacao_workflow.sql
  - id: openwiki-source-7b20bb5e8ae8bd867c8829f9
    resource: repo://supabase/tests/rls_smoke.sql
  - id: openwiki-source-98d5ddb014a0fd4d678f6f2a
    resource: repo://tsconfig.json
  - id: openwiki-source-fbadcd8591b65031efaaedce
    resource: repo://vitest.config.ts
generated: { by: "openwiki/0.4.3", at: "2026-08-28T11:56:15.901Z" }
---

## Choose the deployable first

This repository contains three independently runnable deployables. The primary product is the `industria24.com.br` replacement marketplace: a strict-TypeScript Next.js 16 App Router application. Public marketplace routes are rooted in `src/app`; route groups isolate admin, seller, affiliate, and logistics-partner surfaces, while reusable rules and integration adapters belong in `src/lib`.

| Deployable | Working directory | Responsibility | Local commands |
| --- | --- | --- | --- |
| Marketplace web app | repository root | Customer-facing marketplace and role-specific App Router surfaces | `npm run dev`, `npm run lint`, `npm run test`, `npm run build` |
| MCP service | `mcp-server/` | Separate Streamable HTTP API for third-party MCP hosts | `npm run build`, `npm start` |
| Operations dashboard | `dashboard-ops/` | Separate Next.js dashboard for GitHub, Vercel, Sentry, and cron operational views | `npm run dev`, `npm run lint`, `npm run build`, `npm run start` |

Do not assume a root build or test validates either subproject. The dashboard has its own package manifest and pins its Next tracing root to its own directory. Its UI polls its own GitHub, Vercel, Sentry, and cron API routes every 30 seconds; operational behavior belongs in the operations page, not in marketplace UI work.

Before editing either Next.js application, read the relevant installed guide under `node_modules/next/dist/docs/` from that application's directory. The repository explicitly treats this Next version as breaking from prior conventions. Source code and tests are authoritative; OpenWiki pages provide just-in-time context and verification guidance rather than requirements.

## Run the marketplace locally

From the repository root:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` before using data-backed routes. The root template deliberately excludes `SUPABASE_SERVICE_ROLE_KEY`: privileged Supabase credentials belong only in server-side or edge contexts. Git ignores `.env*` while retaining `.env.example`; do not commit a copied local environment file, provider credential, or token.

Useful root validation and production commands are:

```bash
npm run lint
npm run test
npm run build
npm run start
```

`npm run test` is a one-shot Vitest run. Its Node-environment configuration includes `src/**/*.test.ts` and `scripts/**/*.test.ts`, so choose the narrowest applicable test first and use build validation for route, server/client-boundary, or Next configuration changes. Routes that need real data intentionally show an explicit error when local configuration is absent; do not replace that condition with mock visual data.

The root layout wraps every routed page in cart and affiliate-selection providers, and renders the chat widget and mobile tab bar. Changes to these cross-cutting UI features can affect every marketplace route.

## Run the MCP service when the change crosses the partner boundary

Use a separate shell:

```bash
cd mcp-server
npm install
cp .env.example .env
npm run build
npm start
```

The standalone listener defaults to `http://0.0.0.0:3333/mcp`; `HOST` and `PORT` override the bind. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are server-only requirements. `SUPABASE_ANON_KEY` is additionally required for the buyer-authenticated checkout tool; it is not a substitute for the service role. MCP writes start disabled: `MCP_WRITE_ENABLED` enables `catalogo`, `pedidos`, or `checkout` module by module, and `ALLOWED_HOSTS` can enable an Origin allowlist and DNS-rebinding protection.

Partners present an `i24_` Bearer token, never a database credential. Each stateless `POST /mcp` authenticates that token and creates a per-request MCP server; invalid, revoked, expired, or insufficient tokens receive a 401 JSON-RPC response. Read and write authority, store ownership, feature gates, auditing, and the checkout two-principal exception are documented in [MCP Partner API](./integrations/mcp-partner-api.md). Do not relax those guards to simplify a tool change.

## Preserve shared delivery and security constraints

- **Schema or authorization work:** evolve persisted behavior through `supabase/migrations/` and inspect the relevant SQL E2E and RLS regression scripts in `supabase/tests/`. Migration filenames use manual four-digit prefixes; CI rejects duplicate prefixes.
- **Configuration and inbound endpoints:** root `next.config.ts` applies security headers on all routes and rewrites `/webhooks/uber-direct` to `/api/webhooks/uber-direct`. Sentry build configuration can upload source maps when Vercel credentials exist, but missing credentials do not block the build. Check the operations and external-webhook pages before changing these boundaries.
- **CI scope:** pushes and pull requests to `master` run Gitleaks; root `npm ci`, lint, build, and high-or-higher `npm audit`; root Vitest; and the migration-prefix collision check. Run the relevant local commands, but do not mistake root CI coverage for validation of the MCP service or dashboard.

## Route the task before coding

Use the page that owns the changed boundary. For unfamiliar work, identify the acting role, state owner, integration boundary, and failure path first; then select focused proof in the testing page.

| If the change concerns… | Read first |
| --- | --- |
| Deployable boundaries, App Router entrypoints, server actions, callbacks, or scheduled entrypoints | [System Map and Runtime Boundaries](./architecture/system-map.md) |
| Supabase client trust modes, RLS, RPCs, Storage, generated types, or migrations | [Data Access, Security, and Schema Evolution](./architecture/data-access-security-and-schema-evolution.md) |
| Catalog visibility, roles, seller onboarding, moderation, affiliate participation, or logistics-partner participation | [Marketplace Catalog, Roles, and Moderation](./concepts/marketplace-catalog-and-roles.md) |
| Cart validation, payment, order status, cancellation, confirmation, payout, or notifications | [Checkout, Payment, and Order Lifecycle](./workflows/checkout-payment-and-order-lifecycle.md) |
| Freight selection, quotes, dispatch, tracking, Uber Direct, or partner handoff | [Fulfillment and Logistics](./workflows/fulfillment-and-logistics.md) |
| Collective purchases, future sales, reverse auctions, attribution, commissions, or collective-stage automation | [Collective Commerce, Future Sales, Auctions, and Affiliates](./workflows/collective-commerce-and-affiliates.md) |
| Delivered-order disputes, evidence, seller response, mediation, SLA escalation, or resolution | [After-Sales Disputes and Mediation](./workflows/after-sales-disputes.md) |
| MCP transport, tokens, store scoping, tool permissions, auditing, logistics tracking, or MCP checkout | [MCP Partner API](./integrations/mcp-partner-api.md) |
| Site chat, WhatsApp identity, support tools, curation, AI agents, or deterministic decision boundaries | [AI Assistance and Customer Channels](./integrations/ai-assistance-and-customer-channels.md) |
| Asaas, Uber Direct, Resend, Bubblewhats, Maps, Turnstile, Sentry, or webhook contracts | [External Services and Webhooks](./integrations/external-services-and-webhooks.md) |
| Environment partitions, headers, Sentry, cron authorization/history, dashboard polling, proxies, or Grafana metrics | [Runtime Configuration and Observability](./operations/runtime-configuration-and-observability.md) |
| Unit, adapter, SQL E2E/RLS, migration, or CI proof appropriate to a changed boundary | [Verification Strategy](./testing/verification-strategy.md) |
