---
type: quickstart guide
title: Repository Quickstart and Change Routing
description: Start and validate the marketplace, MCP partner service, or operations dashboard from the correct package. Use the routing map to find the authoritative architecture, workflow, integration, operations, and testing context before changing a boundary.
tags: [quickstart, repository, development, validation, change-routing]
verified:
  - by: openwiki/0.4.3
    at: 2026-09-18T12:45:48.051Z
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-ea70eb6c045047448e446296
    resource: repo://.gitignore
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
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
generated: { by: "openwiki/0.4.3", at: "2026-09-18T12:45:48.051Z" }
---

# Repository Quickstart and Change Routing

## Choose the deployable first

This repository contains three independently runnable deployables. The primary product is the replacement marketplace at `industria24.com.br`: a strict-TypeScript Next.js 16 App Router application. Public marketplace routes are rooted in `src/app`; route groups isolate admin, seller, affiliate, and partner areas, while reusable business rules and integration adapters belong in `src/lib`.

| Deployable | Working directory | Responsibility | Local commands |
| --- | --- | --- | --- |
| Marketplace web app | repository root | Customer-facing marketplace and role-specific App Router surfaces | `npm run dev`, `npm run lint`, `npm run test`, `npm run build` |
| MCP service | `mcp-server/` | Separate Streamable HTTP API for third-party MCP hosts | `npm run build`, `npm start` |
| Operations dashboard | `dashboard-ops/` | Separate Next.js dashboard for GitHub, Vercel, Sentry, and cron operational views | `npm run dev`, `npm run lint`, `npm run build`, `npm run start` |

A root build or test does **not** validate either subproject. The dashboard has its own manifest and fixes Next output-file tracing to its directory. Its browser polls its GitHub, Vercel, Sentry, and cron routes every 30 seconds, so dashboard operational work is separate from marketplace UI work.

Before editing either Next.js application, read the relevant installed guide under `node_modules/next/dist/docs/` from that application's directory. This repository treats its Next version as breaking from prior conventions. Source code and tests are authoritative; these pages are just-in-time context and verification guidance.

## Run the marketplace locally

From the repository root:

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.example` is an intentionally blank, versioned copy target; fill `.env.local` with the real configuration required by the route or integration being exercised. Data-backed routes deliberately show an explicit error state when real configuration is absent—do not introduce mock-data visual fallbacks.

Keep credentials out of source control. `.gitignore` ignores `.env*` while explicitly retaining `.env.example`; never commit a copied local environment file, provider credential, access token, or service-role key. Keep privileged Supabase access in server-side/edge code, not client components.

Useful root validation and production commands are:

```bash
npm run lint
npm run test
npm run build
npm run start
```

`npm run test` is a one-shot Vitest run. Its Node-environment configuration discovers `src/**/*.test.ts` and `scripts/**/*.test.ts` and resolves `@` to `src`. Start with the narrowest affected test; also run a build when changing routes, server/client boundaries, or Next configuration. New business rules should live in the appropriate `src/lib/<domain>/` module with a companion test rather than being embedded in a component or route handler.

The root layout installs cart and affiliate-selection providers, a mobile tab bar, and the chat widget around routed content. A change to one of those cross-cutting features can affect every marketplace route.

## Run the MCP service for a partner-boundary change

Use a separate shell:

```bash
cd mcp-server
npm install
cp .env.example .env
npm run build
npm start
```

The standalone listener defaults to `http://0.0.0.0:3333/mcp`; `HOST` and `PORT` override the bind. The server requires server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. `SUPABASE_ANON_KEY` is additionally necessary for buyer-authenticated checkout, not a replacement for service-role access. Writes begin disabled; `MCP_WRITE_ENABLED` enables `catalogo`, `pedidos`, or `checkout` module by module, and `ALLOWED_HOSTS` optionally enables an Origin allowlist with DNS-rebinding protection.

Partners present an `i24_` Bearer token, never database credentials. Each stateless `POST /mcp` authenticates that token before creating a per-request server; invalid authentication returns a 401 JSON-RPC error, while `GET` and `DELETE` session requests receive 405. Token scope, module gates, store ownership constraints, and write auditing are required controls. The checkout tool is deliberately different: it uses the supplied buyer access token with the anon key, so checkout executes under the buyer's RLS identity rather than the service role.

## Preserve shared delivery and security constraints

- **Schema or authorization work:** make persistent changes through `supabase/migrations/`. Use `scripts/proximo-migration.sh` to select and recheck the manually assigned four-digit prefix; CI rejects collisions. Every new table starts with RLS enabled and no policy until a confirmed business rule defines it. Preserve deny-by-default and inspect focused SQL E2E/RLS regression scripts in `supabase/tests/`.
- **Configuration and inbound endpoints:** `next.config.ts` applies static security headers to every route, rewrites `/webhooks/uber-direct` to `/api/webhooks/uber-direct`, and configures optional Sentry source-map upload. Per-request CSP is emitted by `src/proxy.ts`, not static Next configuration. Review the operations and external-webhook pages before changing these boundaries.
- **CI scope:** pushes and pull requests to `master` run Gitleaks; root `npm ci`, lint, build, and high-or-higher `npm audit`; root Vitest; and the migration-prefix collision check. Run the relevant local commands, but do not mistake root CI coverage for validation of the MCP service or dashboard.

## Route the task before coding

Identify the acting role, durable state owner, integration boundary, and failure path before implementation. Then read the owning page and select focused proof in the testing page.

| If the change concerns… | Read first |
| --- | --- |
| Deployable boundaries, App Router entrypoints, server actions, callbacks, or scheduled entrypoints | [System Map and Runtime Boundaries](./architecture/system-map.md) |
| Supabase client trust modes, RLS, RPCs, Storage, generated types, or migrations | [Data Access, Authorization, and Schema Evolution](./architecture/data-access-security-and-schema-evolution.md) |
| Catalog visibility, roles, seller onboarding, moderation, coverage, affiliates, or logistics-partner ownership | [Marketplace Catalog, Coverage, and Role Ownership](./concepts/marketplace-catalog-and-roles.md) |
| Product availability, immutable stock ledger, distribution centers, warehouse addresses, order reservations, expiration, shipping consumption, or stock alerts | [Inventory Ledger, Reservations, and Warehouse Locations](./workflows/inventory-ledger-and-reservations.md) |
| Cart validation, payment, order status, cancellation, confirmation, payout, or notifications | [Checkout, Payment, and Order Lifecycle](./workflows/checkout-payment-and-order-lifecycle.md) |
| Freight selection, quotes, dispatch, tracking, Uber Direct, or partner handoff | [Fulfillment and Logistics](./workflows/fulfillment-and-logistics.md) |
| Collective purchases, future sales, reverse auctions, attribution, commissions, or collective-stage automation | [Collective Commerce and Affiliates](./workflows/collective-commerce-and-affiliates.md) |
| Delivered-order disputes, evidence, seller response, mediation, SLA escalation, or resolution | [After-sales Disputes and Mediation](./workflows/after-sales-disputes.md) |
| Site chat, WhatsApp identity, support tools, curation, AI agents, or deterministic decision boundaries | [AI Assistance and Customer Channels](./integrations/ai-assistance-and-customer-channels.md) |
| Asaas, Uber Direct, Resend, Bubblewhats, Maps, Turnstile, Sentry, or webhook contracts | [External Services and Webhooks](./integrations/external-services-and-webhooks.md) |
| Environment partitions, headers, Sentry, cron authorization/history, dashboard polling, proxies, or Grafana metrics | [Runtime Configuration and Observability](./operations/runtime-configuration-and-observability.md) |
| Unit, adapter, SQL E2E/RLS, migration, or CI proof appropriate to a changed boundary | [Verification Strategy and Safety-Critical Test Boundaries](./testing/verification-strategy.md) |
