---
type: quickstart guide
title: Repository Quickstart and Change Routing
description: Start and validate the marketplace, MCP partner service, or operations dashboard from the correct package. Use the routing map to find the authoritative architecture, workflow, integration, operations, and testing context before changing a boundary.
tags: [quickstart, repository, development, validation, change-routing]
verified:
  - by: openwiki/0.4.3
    at: 2026-09-23T13:24:35.866Z
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
  - id: openwiki-source-98da77ced0fda4fd463b30d2
    resource: repo://scripts/proximo-migration.sh
  - id: openwiki-source-8d46e58add4326fa55236087
    resource: repo://src/app/layout.tsx
  - id: openwiki-source-f34ac1e549d94dc3ac475ae4
    resource: repo://src/proxy.ts
  - id: openwiki-source-f6d061e83261abf20001d210
    resource: repo://supabase/tests/e2e_disputas_mediacao_workflow.sql
  - id: openwiki-source-7b20bb5e8ae8bd867c8829f9
    resource: repo://supabase/tests/rls_smoke.sql
  - id: openwiki-source-98d5ddb014a0fd4d678f6f2a
    resource: repo://tsconfig.json
  - id: openwiki-source-fbadcd8591b65031efaaedce
    resource: repo://vitest.config.ts
generated: { by: "openwiki/0.4.3", at: "2026-09-23T13:24:35.866Z" }
---

## Choose the deployable first

This checkout contains three independently packaged applications. Start by identifying the runtime that owns the behavior; a root command validates **only the marketplace application**, not the MCP service or operations dashboard.

| Deployable | Working directory | Responsibility | Primary local validation |
| --- | --- | --- | --- |
| Marketplace web app | repository root | The `industria24.com.br` replacement marketplace: public App Router routes, role-specific panels, shared rules, and web integrations | `npm run lint`, `npm run test`, `npm run build` |
| MCP service | `mcp-server/` | A separately deployed, stateless Streamable HTTP MCP endpoint for partner hosts | `npm run build`; start it and exercise the applicable endpoint or tool |
| Operations dashboard | `dashboard-ops/` | A separate Next.js dashboard for GitHub, Vercel, Sentry, and cron operational views | `npm run lint`, `npm run build` |

The root marketplace is strict-TypeScript Next.js 16 with the App Router. Public routes are at the root of `src/app`; route groups separate admin, seller, affiliate, and partner areas. Shared business rules and integration adapters belong in `src/lib`. The root TypeScript configuration excludes both `mcp-server` and `dashboard-ops`, and each has its own manifest and lockfile. Therefore, run installation and validation in the subproject whenever a change touches it; root CI does not establish that either independently packaged application builds or works.

Before changing either Next.js application, consult the relevant installed documentation under `node_modules/next/dist/docs/` from that application's directory. The repository explicitly treats its Next.js version as having breaking changes. Treat source and tests as authoritative; use the linked pages below for focused context rather than duplicating their rules here.

## Marketplace setup and proof

From the repository root, install dependencies, create the ignored local environment file, populate it with real authorized configuration, then start development:

```bash
npm install
cp .env.example .env.local
npm run dev
```

The committed root `.env.example` is intentionally an empty template, not a ready-to-run credential set. Data-backed marketplace routes deliberately render an explicit error state when required real configuration is unavailable. Do **not** replace missing configuration, inaccessible data, schema, or provider responses with mock data or a mock visual fallback. Do not commit `.env.local`, tokens, provider credentials, or a Supabase service-role key; `.env*` is ignored while `.env.example` remains versioned.

Use the narrowest proof that exercises the changed behavior, then run the applicable root gates:

```bash
npm run lint
npm run test
npm run build
npm run start
```

`npm run test` is a one-shot Vitest run in the Node environment. It discovers `src/**/*.test.ts` and `scripts/**/*.test.ts`, resolving the `@/` alias to `src`. For new or changed pure business rules, put the focused test beside the rule and prove it first; use `npm run build` for App Router, server/client boundary, or Next configuration changes. Marketplace-wide layout changes require extra care because the root layout installs cart and affiliate-selection providers, the chat widget, mobile tab bar, and cookie notice around routed content.

## MCP service setup and safety boundary

For a partner API change, work in its own package and use a separate environment file:

```bash
cd mcp-server
npm install
cp .env.example .env
npm run build
npm start
```

The standalone listener defaults to `http://0.0.0.0:3333/mcp`; `HOST` and `PORT` override that bind. `GET /health` is available for a basic running-process check. The MCP package has no root validation coverage: build it in `mcp-server/`, start it with its intended configuration, and test the affected transport/tool path separately.

This is a trust boundary, not an alternate marketplace client. The service needs server-side Supabase URL and service-role credentials. The buyer checkout tool additionally uses the Supabase anon key with a buyer-supplied access token so its database work remains subject to that buyer's RLS identity. Partners receive `i24_` Bearer tokens rather than database credentials. Writes begin disabled and require both a write-scoped token and module enablement; keep store scoping, ownership guards, auditing, and optional `ALLOWED_HOSTS` DNS-rebinding protection intact. See [MCP Partner API](./integrations/mcp-partner-api.md) before changing transport, authentication, tools, token issuance, or checkout.

## Operations dashboard setup

The operations dashboard is another isolated Next.js package. Its Next configuration fixes the tracing root to `dashboard-ops`, preventing the marketplace application's files from being inferred as its tracing context.

```bash
cd dashboard-ops
npm install
npm run dev
npm run lint
npm run build
npm run start
```

Its browser page polls its GitHub, Vercel, Sentry, and cron routes every 30 seconds. A root build, lint, or Vitest result does not validate this dashboard, its provider-backed API routes, or its operational credentials. Route environment, scheduled-work, alerting, observability, and degraded-provider diagnosis through [Runtime Configuration, Scheduled Work, and Observability](./operations/runtime-configuration-and-observability.md).

## Repository safety and CI baseline

- **No fabricated fallbacks.** Preserve explicit failure states when real configuration or data is absent. Do not invent schema, credentials, or mock records to make a page appear functional.
- **Secrets stay local and scoped.** Never expose service-role credentials to browser code or MCP partners. Revise, revoke, and reissue leaked partner tokens instead of sharing replacements in source or logs.
- **Schema and authorization are migration-led.** Change persisted behavior through `supabase/migrations/`; use the SQL E2E and RLS regression scripts in `supabase/tests/` as relevant evidence. Four-digit migration prefixes must be unique; use `scripts/proximo-migration.sh` to select a number and `scripts/proximo-migration.sh --checar` before pushing.
- **Root CI is necessary but limited.** On pushes and pull requests to `master`, CI runs Gitleaks, root `npm ci`, lint, build, `npm audit --audit-level=high`, root Vitest, and the duplicate migration-prefix check. It does not install, lint, build, or test `mcp-server/` or `dashboard-ops/`.
- **Configuration can affect request boundaries.** The marketplace Next configuration applies static security headers site-wide, keeps nonce-dependent CSP work in the request proxy, redirects legacy paths, rewrites the Uber Direct compatibility webhook path to its API route, and configures optional Sentry source-map upload. Read the operations and integration pages before changing any of those contracts.

## Route the task before coding

Identify the acting role, state owner, integration boundary, and failure path, then read the page that owns the change. The table is intentionally a routing map; it does not replace the detailed rules on those pages.

| If the change concerns… | Read first |
| --- | --- |
| Deployable boundaries, App Router entrypoints, server actions, callbacks, or scheduled entrypoints | [System Map and Runtime Boundaries](./architecture/system-map.md) |
| Supabase client trust modes, RLS, RPCs, Storage, generated types, or migrations | [Data Access, Security, and Schema Evolution](./architecture/data-access-security-and-schema-evolution.md) |
| Catalog visibility, coverage, buyer/seller roles, taxonomy, seller onboarding, moderation, affiliates, or logistics partners | [Marketplace Catalog, Coverage, and Role Surfaces](./concepts/marketplace-catalog-and-roles.md) |
| Cart validation, payment, order status, cancellation, confirmation, payout, or notifications | [Checkout, Payment, and Order Lifecycle](./workflows/checkout-payment-and-order-lifecycle.md) |
| Freight selection, quotes, dispatch, tracking, Uber Direct, proof of delivery, or partner handoff | [Fulfillment and Logistics](./workflows/fulfillment-and-logistics.md) |
| Inventory reservations, ledger entries, fulfillment centers, receiving, picking, shipping, or stock alerts | [Inventory Ledger and Warehouse Operations](./workflows/inventory-ledger-and-warehouse-operations.md) |
| Collective purchases, future sales, affiliate attribution, commissions, or partner logistics affiliation | [Collective Commerce, Future Sales, and Affiliates](./workflows/collective-commerce-and-affiliates.md) |
| Delivered-order disputes, evidence, seller response, mediation, SLA escalation, or resolution | [After-Sales Disputes and Mediation](./workflows/after-sales-disputes.md) |
| MCP transport, tokens, store scoping, tool permissions, auditing, logistics tracking, or MCP checkout | [MCP Partner API](./integrations/mcp-partner-api.md) |
| Site chat, WhatsApp identity, support tools, curation, AI agents, or deterministic decision boundaries | [AI Assistance and Customer Channels](./integrations/ai-assistance-and-customer-channels.md) |
| Asaas, Uber Direct, Meta/WhatsApp, Bubblewhats, email, CEP/geocoding, Turnstile, Sentry, or webhook contracts | [External Services and Webhooks](./integrations/external-services-and-webhooks.md) |
| Environment partitions, headers, Sentry, cron authorization/history, dashboard polling, proxies, or Grafana metrics | [Runtime Configuration, Scheduled Work, and Observability](./operations/runtime-configuration-and-observability.md) |
| Unit, adapter, SQL E2E/RLS, migration, CI, or cross-runtime proof for a changed boundary | [Verification Strategy](./testing/verification-strategy.md) |
