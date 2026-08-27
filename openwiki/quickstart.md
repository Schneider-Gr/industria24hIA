---
type: "Reference"
title: "Quickstart"
openwiki_generated: true
verified:
  - by: openwiki/0.4.3
    at: 2026-08-27T11:16:58.491Z
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-ea70eb6c045047448e446296
    resource: repo://.gitignore
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-669c6b5d119a0cd3142bce3e
    resource: repo://mcp-server/.env.example
  - id: openwiki-source-54eca42f00a391caed4f9e84
    resource: repo://mcp-server/package.json
  - id: openwiki-source-c373fa2f3980420c295ffe54
    resource: repo://mcp-server/README.md
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
generated: { by: "openwiki/0.4.3", at: "2026-08-27T11:16:58.491Z" }
---


## What is in this repository

This repository is the replacement marketplace at `industria24.com.br` (not the legacy Bubble site `industria24h.com.br`). The primary application is a strict-TypeScript **Next.js 16 App Router** application with React, Tailwind, Supabase, Sentry, and Vitest. Its public marketplace routes live directly under `src/app/`; route groups separate the administrative, seller, affiliate, and logistics-partner surfaces. Reusable business rules and external-service adapters belong in `src/lib/`, rather than in page components or route handlers.

`mcp-server/` is a second, independent Node/Express deployable. It exposes the Streamable HTTP MCP endpoint for third-party hosts and has its own package manifest, lockfile, environment file, build, and start command. Do not assume that changing the web application also builds, starts, or validates the MCP service.

Before changing any Next.js 16 code, read the relevant installed guide under `node_modules/next/dist/docs/`. This is a repository rule because the installed version has breaking API, convention, and file-structure changes.

## Get the web application running

Use the repository root for marketplace work:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Populate `.env.local` with the public Supabase URL and anon key before exercising data-backed functionality. The template also documents optional observability and integration settings. It intentionally keeps `SUPABASE_SERVICE_ROLE_KEY` out of the browser-facing application configuration: privileged credentials belong only in server-side/edge contexts. Local environment files are ignored by Git; never commit credentials, tokens, or a copied environment file.

Useful root commands are:

```bash
npm run lint
npm run test
npm run build
npm run start
```

`npm run test` runs Vitest once, discovering `src/**/*.test.ts` and `scripts/**/*.test.ts` in the Node environment. Run the narrowest relevant test first when possible, then use the commands above appropriate to the change. A build is especially important for routing, server/client boundaries, and Next.js configuration changes.

Without a populated local environment, routes that require real data deliberately show an explicit error rather than a mock-data visual fallback. Treat that as missing configuration, not as permission to add misleading sample data.

## Start the MCP service only when the change reaches that boundary

For MCP work, use a separate shell and working directory:

```bash
cd mcp-server
npm install
cp .env.example .env
npm run build
npm start
```

The standalone server binds to `http://0.0.0.0:3333/mcp` by default; `PORT` and `HOST` can override that. Its required server-side Supabase connection uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; its checkout capability additionally needs `SUPABASE_ANON_KEY`. `MCP_WRITE_ENABLED` is a comma-separated, gradual enablement switch for `catalogo`, `pedidos`, and `checkout`, and defaults to no write modules. `ALLOWED_HOSTS` optionally supplies an Origin allowlist.

Keep this boundary strict: MCP partners authenticate with their own `i24_` bearer token, not database credentials. The server validates the token, scopes writes to the token's store, requires enabled write modules, and records write audits. Token issuance, revocation, approval, ownership constraints, and tool contracts are documented in the [MCP Partner API and Scoped Store Access](./integrations/mcp-partner-api.md) page; do not weaken those guards merely to make a tool easier to test.

## Change safely

- **Start at the actual owner.** App Router pages and route handlers are under `src/app/`; corresponding UI is commonly under `src/components/`; shared rules, Supabase clients, and service adapters are under `src/lib/`. Follow callers and existing tests before relocating logic.
- **Preserve the trust boundary.** Public Supabase settings may be prefixed `NEXT_PUBLIC_`; secrets such as service-role keys, payment/provider credentials, and signing keys must remain server-only. The environment template describes the failure posture of several optional integrations, including no-op Sentry/Resend behavior and the fail-closed WhatsApp webhook signature behavior.
- **Use migrations for schema changes.** Migrations are manually numbered files in `supabase/migrations/`. Their first four digits must be unique: CI explicitly rejects duplicate prefixes. Review the applicable SQL/RLS regression scripts under `supabase/tests/` when a database RPC, authorization policy, or sensitive workflow changes.
- **Do not bypass delivery safeguards.** CI on `master` pull requests and pushes runs Gitleaks, `npm ci` plus lint/build, `npm audit --audit-level=high`, Vitest, and the migration-prefix check. A passing local command is useful feedback; it does not replace the applicable CI gates.
- **Account for runtime behavior.** `next.config.ts` applies site-wide security headers and rewrites `/webhooks/uber-direct` to `/api/webhooks/uber-direct`. Sentry source-map upload settings are build-time Vercel credentials; absence only warns and does not prevent the build. Consult the operations page before changing headers, webhook URLs, scheduled callers, environment behavior, or telemetry.

## Route the task to the right page

Use this map to get domain context before implementing a change. These pages are complementary: this page is a starting point, not the authority for a complex workflow or security boundary.

| If the change concerns… | Read first |
| --- | --- |
| App Router surfaces, runtime boundaries, Supabase clients, or where code should live | [System Map and Runtime Boundaries](./architecture/system-map.md) |
| database privileges, RLS/RPCs, Storage, generated types, or migrations | [Supabase Data Access, Authorization, and Schema Evolution](./architecture/data-access-security-and-schema-evolution.md) |
| catalog/store moderation or actor-specific marketplace behavior | [Marketplace Catalog, Actors, and Moderation](./concepts/marketplace-catalog-and-roles.md) |
| checkout, Asaas payments, order status, cancellation, or notifications | [Checkout, Payments, and Order Lifecycle](./workflows/checkout-payment-and-order-lifecycle.md) |
| freight quotes, delivery dispatch/tracking, rides, or logistics partners | [Freight Quoting, Delivery Dispatch, and Logistics Partners](./workflows/fulfillment-and-logistics.md) |
| collective purchases, future sales, reverse auctions, or affiliate economics | [Collective Commerce, Future Sales, Auctions, and Affiliates](./workflows/collective-commerce-and-affiliates.md) |
| buyer/seller chat, evidence, disputes, mediation, or SLA handling | [Post-Sale Support, Chat, and Dispute Resolution](./workflows/after-sales-disputes.md) |
| third-party MCP tools, tokens, scopes, partner authorization, or MCP deployment | [MCP Partner API and Scoped Store Access](./integrations/mcp-partner-api.md) |
| WhatsApp, AI agents, bot identity gates, or escalation | [AI Assistance, Bot Conversations, and Escalation](./integrations/ai-assistance-and-customer-channels.md) |
| Asaas, Uber, Meta, Bubblewhats, email, Maps/CEP, Turnstile, or inbound webhooks | [External Services and Webhook Contracts](./integrations/external-services-and-webhooks.md) |
| environment partitions, Vercel/Sentry, headers, cron, or operational signals | [Runtime Configuration, Deployment, Scheduled Work, and Observability](./operations/runtime-configuration-and-observability.md) |
| selecting focused unit/SQL tests, CI expectations, or migration safety validation | [Verification Strategy and Database Safety Tests](./testing/verification-strategy.md) |

For an unfamiliar change, identify its user role, state owner, integration boundary, and failure path before coding; then validate the smallest behavior that proves the invariant you changed.
