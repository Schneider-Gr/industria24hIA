---
type: repository quickstart guide
title: Repository Quickstart and Change Routing
description: Start and validate the marketplace, MCP partner service, or operations dashboard from the correct package. Use the routing map to reach the owning workflow, data, operations, and verification guidance before changing a boundary.
tags: [quickstart, repository, development, validation, change-routing]
verified:
  - by: openwiki/0.4.3
    at: 2026-08-28T19:56:09.348Z
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
  - id: openwiki-source-2cbc059c30443b1e7749fbce
    resource: repo://src/lib/asaas-confirmar.ts
  - id: openwiki-source-91542766e916636c909539ce
    resource: repo://src/lib/auth-destino.test.ts
  - id: openwiki-source-1f1163dac5639d1e173e0595
    resource: repo://src/lib/auth-destino.ts
  - id: openwiki-source-22f1a51f3dd967c105fa32fa
    resource: repo://src/lib/auth.ts
  - id: openwiki-source-a35f8a682526639a2ef6c2c8
    resource: repo://src/lib/repasses.ts
  - id: openwiki-source-83c9d16c944e51af5cefed53
    resource: repo://supabase/migrations/0150_checkout_frete_tabela_importada.sql
  - id: openwiki-source-0585b703835f6358f5f665dd
    resource: repo://supabase/migrations/0151_repasse_status_processando.sql
  - id: openwiki-source-7cc6fd2f1b32893b792d3a31
    resource: repo://supabase/migrations/0152_loja_situacao_em_analise.sql
  - id: openwiki-source-f6d061e83261abf20001d210
    resource: repo://supabase/tests/e2e_disputas_mediacao_workflow.sql
  - id: openwiki-source-7b20bb5e8ae8bd867c8829f9
    resource: repo://supabase/tests/rls_smoke.sql
  - id: openwiki-source-98d5ddb014a0fd4d678f6f2a
    resource: repo://tsconfig.json
  - id: openwiki-source-fbadcd8591b65031efaaedce
    resource: repo://vitest.config.ts
generated: { by: "openwiki/0.4.3", at: "2026-08-28T19:56:09.348Z" }
---

# Repository Quickstart and Change Routing

## Choose the deployable first

This repository hosts the replacement `industria24.com.br` marketplace, implemented as a strict-TypeScript Next.js 16 App Router application. Public routes are rooted in `src/app`; route groups separate administrative, seller, affiliate, and partner areas, while reusable business logic and integrations live in `src/lib`.

| Deployable | Working directory | Responsibility | Local commands |
| --- | --- | --- | --- |
| Marketplace web app | repository root | Marketplace and role-specific App Router surfaces | `npm run dev`, `npm run lint`, `npm run test`, `npm run build`, `npm run start` |
| MCP service | `mcp-server/` | Independently packaged partner-facing MCP HTTP service | `npm run build`, `npm start` |
| Operations dashboard | `dashboard-ops/` | Independently packaged Next.js operational dashboard | `npm run dev`, `npm run lint`, `npm run build`, `npm run start` |

Do not treat a root build or test as validation of either subproject. The dashboard has its own manifest and output-tracing root, and polls its GitHub, Vercel, Sentry, and cron routes every 30 seconds. Before editing either Next.js application, consult the relevant installed documentation under `node_modules/next/dist/docs/`; this Next.js version has breaking changes.

## Run and validate the marketplace

From the repository root:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` before using data-backed routes. The service-role key is deliberately excluded from the public template and belongs only in server-side or edge configuration. `.env*` is ignored while `.env.example` remains versioned; never commit copied local configuration, provider credentials, or tokens. With no populated `.env.local`, data-backed routes intentionally show an explicit error rather than a mock-data fallback.

Use the narrowest proof that covers the changed boundary, then run the root gates appropriate to a marketplace change:

```bash
npm run lint
npm run test
npm run build
npm run start
```

`npm run test` is a one-shot Vitest run. It uses the Node environment and discovers `src/**/*.test.ts` and `scripts/**/*.test.ts`; a build remains important for routing, server/client-boundary, and Next configuration changes. The root layout supplies cart and affiliate-selection providers around routed content, so changes to those cross-cutting UI features can affect all marketplace routes.

For database work, evolve schema through `supabase/migrations/` and inspect the focused SQL E2E/RLS scripts under `supabase/tests/`. Prefixes are manually allocated; CI rejects duplicate four-digit prefixes. The root CI on pushes and pull requests to `master` runs Gitleaks, `npm ci`, lint, build, high-or-higher `npm audit`, Vitest, and that prefix-collision check. It does not prove a deployed RPC, trigger, RLS policy, or provider race.

## Route the task before coding

Identify the acting role, durable state owner, integration boundary, and failure path. Read the owning page first, then use [Verification Strategy](./testing/verification-strategy.md) to choose the proof.

| If the change concerns… | Read first | Preserve or prove |
| --- | --- | --- |
| Runtime boundaries, App Router entrypoints, server actions, callbacks, or scheduled handlers | [System Map and Runtime Boundaries](./architecture/system-map.md) | The owning deployable and server/client trust boundary. |
| Supabase clients, RLS, RPCs, Storage, generated types, migrations, encrypted identity data, or publication guards | [Data Access, Security, and Schema Evolution](./architecture/data-access-security-and-schema-evolution.md) | Database authorization and migration/grant behavior. |
| Password/Google sign-in, safe `next` redirects, recovery/confirmation email, role precedence, seller/affiliate/partner entry, or administrator access | [Authentication, Account Lifecycle, and Role Onboarding](./workflows/authentication-and-role-onboarding.md) | Server-resolved role destination, safe navigation, and the distinction between navigation gates and database authority. |
| Seller store creation, catalogue visibility, curation, moderation, or role data | [Marketplace Catalog, Roles, and Moderation](./concepts/marketplace-catalog-and-roles.md) | New non-admin stores must remain `EmAnalise` until administrative approval; advisory curation must not publish them. |
| Checkout, orders, Asaas charge/payment confirmation, cancellation, notifications, payouts, or payment recovery | [Checkout, Payment, and Order Lifecycle](./workflows/checkout-payment-and-order-lifecycle.md) | Server/database-owned money values, durable idempotency, and post-payment best-effort boundaries. |
| Imported carrier pricing, freight selection, pickup, dispatch, tracking, Uber Direct, or logistics-partner handoff | [Fulfillment and Logistics](./workflows/fulfillment-and-logistics.md) | Checkout revalidation and dispatch behavior; do not treat a browser quote as the final price. |
| Asaas, Resend, Uber Direct, WhatsApp, Maps, Turnstile, Sentry, or webhook contracts | [External Services and Webhooks](./integrations/external-services-and-webhooks.md) | Provider-specific authentication, retry, and failure semantics. |
| Payout rows stuck in `processando`, server secrets, headers, scheduled work, Sentry, dashboard polling, proxies, or Grafana metrics | [Runtime Configuration and Observability](./operations/runtime-configuration-and-observability.md) | Reconcile an uncertain provider transfer before any retry; `processando` is intentionally excluded from automatic selection. |
| Unit, adapter, linked-Supabase SQL, RLS, migration, concurrent-worker, browser, or provider proof | [Verification Strategy](./testing/verification-strategy.md) | A focused test at the layer that owns the invariant. |
| Collective commerce, future sales, reverse auctions, attribution, commissions, or collective-stage automation | [Collective Commerce, Future Sales, Auctions, and Affiliates](./workflows/collective-commerce-and-affiliates.md) | The workflow-specific commercial state and automation. |
| Delivered-order disputes, evidence, seller response, mediation, SLA escalation, or resolution | [After-Sales Disputes and Mediation](./workflows/after-sales-disputes.md) | The dispute lifecycle and private evidence boundary. |
| MCP transport, tokens, store scoping, tool permissions, auditing, logistics tracking, or MCP checkout | [MCP Partner API](./integrations/mcp-partner-api.md) | Partner scope and the service/buyer credential split. |
| Site chat, WhatsApp identity, support tooling, curation, AI agents, or deterministic decision boundaries | [AI Assistance and Customer Channels](./integrations/ai-assistance-and-customer-channels.md) | Advisory AI versus human/database decisions. |

### High-risk change shortcuts

- **Authentication and onboarding:** `destinoPosLogin` calls a server-only resolver. It checks the session and role records, then delegates to the pure `destinoPorPapel` rule: admin, owned store, affiliate, logistics partner, then home. Update its fast precedence test when adding a role, but separately prove route gates and database authorization.
- **Store moderation:** migration `0152` admits `EmAnalise`, makes it the default for new stores, and rejects a non-admin authenticated insert in another state. Validate this with a linked database and a real seller-to-public-catalogue check; a component test cannot prove the trigger.
- **Payment and freight:** the shared `confirmarPagamentoPedido` entry point is used by webhook and manual/fallback confirmation. It treats non-null `dt_pagamento` as the durable idempotency fact and uses a conditional write so only the winner marks lines paid and begins notification/dispatch. For `tabela_importada`, checkout recomputes freight from `cotar_frete_tabela` on the server and gives the last line the cent remainder, ensuring line freight reconciles exactly with the order freight.
- **Payouts:** before calling Asaas, the payout worker conditionally changes an individual ledger row from `pendente` to `processando`. Only the execution that wins may create the PIX transfer. Successful transfers become `transferido`; caught errors become `falhou`; a crash or uncertain remote result can leave `processando`, which requires manual Asaas reconciliation rather than automatic reset/retry.

These four areas require linked-database and, where applicable, concurrent-worker or mocked-provider evidence in addition to `npm run test`.

## Run the MCP service for partner-boundary work

Use a separate shell:

```bash
cd mcp-server
npm install
cp .env.example .env
npm run build
npm start
```

The standalone listener defaults to `http://0.0.0.0:3333/mcp`; `HOST` and `PORT` override the bind. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are server-only requirements. `SUPABASE_ANON_KEY` is additionally required by the buyer-authenticated checkout tool. Writes start disabled: `MCP_WRITE_ENABLED` enables `catalogo`, `pedidos`, or `checkout` module by module, and `ALLOWED_HOSTS` optionally enables an Origin allowlist and DNS-rebinding protection.

Partners present an `i24_` Bearer token rather than database credentials. Each stateless `POST /mcp` authenticates it before creating a per-request server; invalid authentication returns a 401 JSON-RPC error, while session-oriented `GET` and `DELETE` requests receive 405. Token scope limits writes to the token's store and enabled modules, and writes are audited. The checkout client is different: it uses the Supabase anon key and the buyer-supplied access token, preserving that buyer's RLS identity rather than using the service role. Do not relax these controls to simplify a tool change.

## Cross-cutting configuration and delivery constraints

The marketplace Next configuration applies site-wide security headers, rewrites `/webhooks/uber-direct` to `/api/webhooks/uber-direct`, and configures optional Sentry source-map upload settings that do not make builds fail when credentials are absent. Consult the operations and external-webhook pages before altering these boundaries.

Source code and tests are authoritative. Treat these pages as routing and just-in-time context; preserve full failure output from the narrowest quiet validation that demonstrates the change.
