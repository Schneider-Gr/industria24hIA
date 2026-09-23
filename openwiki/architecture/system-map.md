---
type: system architecture
title: System Map and Runtime Boundaries
description: Maps the deployable applications, callers, trust boundaries, Next.js surfaces, scheduled entrypoints, and domain ownership model used to locate the correct runtime before a change.
tags: [architecture, nextjs, mcp, supabase, operations, runtime-boundaries]
verified:
  - by: openwiki/0.4.3
    at: 2026-09-23T13:24:35.866Z
sources:
  - id: openwiki-source-1307a98427393d045f958ba3
    resource: repo://.github/CODEOWNERS
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-b3540f0c22103fdf5e95b196
    resource: repo://dashboard-ops/app/api/cron/route.ts
  - id: openwiki-source-16a74fc866f7995096536beb
    resource: repo://dashboard-ops/app/api/github/route.ts
  - id: openwiki-source-40e37a0cf3497613950e449c
    resource: repo://dashboard-ops/app/api/sentry/route.ts
  - id: openwiki-source-be00ca561ef9c9f699f0b079
    resource: repo://dashboard-ops/app/api/vercel/route.ts
  - id: openwiki-source-625e2135e33e3cb47ff6220b
    resource: repo://dashboard-ops/app/page.tsx
  - id: openwiki-source-b6305f6550d70beb99a71e65
    resource: repo://dashboard-ops/package.json
  - id: openwiki-source-98bbd73cd806fcee501c934f
    resource: repo://mcp-server/api/index.js
  - id: openwiki-source-54eca42f00a391caed4f9e84
    resource: repo://mcp-server/package.json
  - id: openwiki-source-bf1eced407d3838c6eff15ac
    resource: repo://mcp-server/src/app.ts
  - id: openwiki-source-c8f0ed424254dd3505e45773
    resource: repo://mcp-server/src/auth.ts
  - id: openwiki-source-0e7b4af77106f0b1e650c3c7
    resource: repo://mcp-server/src/checkout.ts
  - id: openwiki-source-e5d73928994963dc9694e4dc
    resource: repo://mcp-server/src/http.ts
  - id: openwiki-source-df02f89d9e676cd0fbcf495c
    resource: repo://mcp-server/src/server.ts
  - id: openwiki-source-50a18d054b596a7ed0eeffb0
    resource: repo://next.config.ts
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-9b5212d30cf3db12db954fa8
    resource: repo://src/app/api/asaas/webhook/route.ts
  - id: openwiki-source-d9643398059a309f0d4eb206
    resource: repo://src/app/api/bot/whatsapp/webhook/route.ts
  - id: openwiki-source-7dfffdf57033009713d121ed
    resource: repo://src/app/api/carrinho/abandono/tick/route.ts
  - id: openwiki-source-5199cdb90afeec6b9455c495
    resource: repo://src/app/api/checkout/cotar-frete/route.ts
  - id: openwiki-source-123a2a8420cd176e43cf8739
    resource: repo://src/app/api/estoque/alerta/tick/route.ts
  - id: openwiki-source-7fd73c740fd1ea10ef48ab59
    resource: repo://src/app/api/estoque/reservas/expirar/route.ts
  - id: openwiki-source-1ff4d84c7f265ad7e31387b2
    resource: repo://src/app/api/observabilidade/cron/route.ts
  - id: openwiki-source-b61c8fae5277ae144c786fb4
    resource: repo://src/app/api/venda-futura/avisos/tick/route.ts
  - id: openwiki-source-a74c23e71678a8deecc4a333
    resource: repo://src/app/api/webhooks/uber-direct/route.ts
  - id: openwiki-source-2cbc059c30443b1e7749fbce
    resource: repo://src/lib/asaas-confirmar.ts
  - id: openwiki-source-22f1a51f3dd967c105fa32fa
    resource: repo://src/lib/auth.ts
  - id: openwiki-source-912a05cb2ad8b6d48298f0c4
    resource: repo://src/lib/supabase/client.ts
  - id: openwiki-source-aaa90d0b1532b9ab92f12d0b
    resource: repo://src/lib/supabase/env.ts
  - id: openwiki-source-f802f56f3907ab650d20eeaa
    resource: repo://src/lib/supabase/public.ts
  - id: openwiki-source-b22459c0abfe5c0d18ee9ed7
    resource: repo://src/lib/supabase/server.ts
  - id: openwiki-source-84fe5c4ea822f9abed688266
    resource: repo://src/lib/supabase/service.ts
  - id: openwiki-source-f34ac1e549d94dc3ac475ae4
    resource: repo://src/proxy.ts
  - id: openwiki-source-55831e92f29f8b3e9d43f58b
    resource: repo://vercel.json
generated: { by: "openwiki/0.4.3", at: "2026-09-23T13:24:35.866Z" }
---

# System Map and Runtime Boundaries

This repository is a **modular monolith with three deployables**. The root `web` application is the marketplace; `mcp-server/` is a partner-facing Express MCP service; and `dashboard-ops/` is an independent Next.js operations dashboard. They share Supabase and some operational services, but they do not share an HTTP request context or credentials.

The web monolith is organized by business ownership rather than technical layer: catalogue/purchase, seller, affiliate, logistics partner, platform administration, and payments/finance. Shared platform paths—especially `src/lib/supabase/`, authentication, rate limiting, migrations, and root configuration—cross all modules and require particularly careful review. `CODEOWNERS` currently documents this boundary even though its configured owner is the same address throughout.

## Runtime context map

```mermaid
flowchart TD
  Browser["Browser session or public visitor"] --> Web["Marketplace Next.js web"]
  Provider["Payment messaging and delivery providers"] --> Web
  Scheduler["Vercel Cron or external scheduler"] --> Web
  Curator["CrewAI curation caller"] --> Web
  MCPClient["Partner MCP client"] --> MCP["MCP Express service"]
  OpsBrowser["Operations dashboard browser"] --> Ops["dashboard-ops Next.js"]
  Web --> Anon["Supabase anon and RLS"]
  Web --> Service["Supabase service role"]
  MCP --> TokenRPC["Partner token RPC"]
  MCP --> MCPService["Supabase service role"]
  Anon --> DB["Supabase Auth and database"]
  Service --> DB
  TokenRPC --> DB
  MCPService --> DB
  Ops --> GitHub["GitHub API"]
  Ops --> Vercel["Vercel API"]
  Ops --> Sentry["Sentry API"]
  Ops --> CronHistory["Marketplace cron history"]
  Ops --> Grafana["Grafana remote write"]
```

This diagram distinguishes callers and trust domains. A browser session, a provider signature, `CRON_SECRET`, an MCP `i24_` token, a buyer access token, and operations-provider credentials are not interchangeable authentication mechanisms.

## Marketplace web application

The root package is a Next.js App Router marketplace. It renders public and session-aware browsing, cart, checkout, orders, and role panels; it also hosts the external HTTP adapters under `src/app/api/`. The root layout provides the cart and affiliate-selection providers, mobile tab bar, site chat widget, and cookie notice across routes.

The public home page is deliberately dynamic: it uses a cookie-aware server client, session and CEP cookies, cached catalogue reads, and delivery-coverage filtering. It presents an explicit error state when Supabase is unconfigured. Without a CEP, it suppresses product listings rather than presenting merchandise that might not be deliverable.

Route groups are deployment-internal UI boundaries, not applications: `(admin)/admin`, `(seller)/seller`, `(afiliado)/afiliado`, and `(parceiro)/parceiro` map to platform administration, seller, affiliate, and logistics-partner surfaces. Public purchase surfaces remain outside those groups. Application role gates improve navigation and early rejection; RLS and scoped RPCs remain the authorization boundary. In particular, seller-store lookup adds `owner_id = user.id` because public store visibility could otherwise select another active seller's store.

### Edge proxy and browser boundary

`src/proxy.ts` refreshes the Supabase session on requests, redirects an unauthenticated request for a session-protected panel to `/login`, and emits CSP per request. It does not resolve roles: route-group layouts and database policy perform that finer check. Public routes receive a CSP compatible with static/ISR rendering; panel and login paths receive a nonce-based strict CSP. Root configuration applies the remaining security headers to every route and rewrites `/webhooks/uber-direct` to `/api/webhooks/uber-direct`.

### Supabase client boundary

Web access is intentionally split by runtime and privilege:

- Browser components use an anon browser client.
- Server Components, Server Actions, and session-aware Route Handlers use a cookie-aware anon client, retaining RLS. In immutable Server Component rendering, cookie writes can be ignored because the proxy refreshes them.
- Public/ISR reads use a cookie-free anon client with session persistence and refresh disabled, retaining RLS without calling `cookies()`.
- Trusted server callbacks and scheduled jobs use the service-role client. It has persistence and refresh disabled and throws when its key is unavailable.

Do not import the service-role client into a client component or ordinary page. It is a narrowly privileged integration boundary, not a shortcut around end-user authorization. Authentication helpers report a failed session refresh to Sentry and treat it as logged out so rendering remains available.

## HTTP entrypoints are caller-specific adapters

A Route Handler does not automatically inherit browser identity. Choose the entrypoint and client from its caller:

| Caller | Boundary and representative work |
| --- | --- |
| Public browser | `GET /api/categorias` and `GET /api/busca-preview` use the cookie-free public client and a per-IP in-memory limiter. That limiter is process-local, so it is not a global cross-instance defense. |
| Signed-in browser | Cart sync requires a session and upserts the abandoned-cart mirror; changed items reset `lembrete_enviado_em`. Freight quotation authenticates and rate-limits the buyer. |
| Payment and provider callbacks | Asaas, Meta WhatsApp, and Uber Direct authenticate with a provider token or signature and make privileged server-side mutations. They do not have browser sessions. |
| Trusted machine caller | CrewAI curation, scheduled ticks, and cron observability use dedicated bearer secrets and service role where needed. |
| Site chat | The handler persists conversation state with service role, but its order and dispute tools use the caller's cookie-session client and RLS. |

### Freight, payment, and delivery control flow

Freight quotes are server-authoritative. The checkout handler first prefers a carrier-table quote, then an internal freight RPC; only when neither is available does it call Uber Direct. It persists the external quote with service role before it returns that option. Provider errors are captured in Sentry and return no quote, rather than an invented price.

```mermaid
sequenceDiagram
  participant Buyer as Signed-in buyer
  participant Web as Freight handler
  participant DB as Supabase
  participant Uber as Uber Direct
  Buyer->>Web: POST cotar-frete
  Web->>DB: carrier table quote
  alt Table result
    DB-->>Web: internal option
    Web-->>Buyer: option
  else No table result
    Web->>DB: internal freight quote
    alt Internal coverage
      DB-->>Web: internal option
      Web-->>Buyer: option
    else No internal coverage
      Web->>Uber: request quote
      Uber-->>Web: external quote
      Web->>DB: persist quote with service role
      Web-->>Buyer: Uber Direct option
    end
  end
```

This is the precedence and persistence sequence after buyer authentication and limiting.

Asaas paid events first validate their token and service-role availability, then call one shared confirmation routine. That routine is idempotent on durable payment state, checks the stored charge ID and received minimum amount, conditionally marks the order and its lines paid, and only then performs notification and delivery routing as best effort. The shared routine is also the manual-verification convergence point; failures after the durable write must not undo a payment. Cancellation events use the cancellation path.

The Uber Direct callback maps recognized provider states to internal delivery state with service role. It only verifies `x-uber-signature` if `UBER_DIRECT_WEBHOOK_SIGNING_KEY` is configured; without that key it accepts callbacks. Treat configuring that key as a production security requirement.

### Conversational and AI ingress

Meta WhatsApp has a separate identity model from browser sessions. Its webhook verifies raw-body HMAC before processing, finds or creates a phone-bound open conversation, and can resolve an account from supplied contact information. Before it returns order information, it additionally requires the order contact phone to match the sender. The CrewAI curation endpoint instead authenticates with `CREWAI_CURADORIA_TOKEN`, confirms the product exists, and inserts a typed suggestion for a later admin application or discard.

## Scheduled work and operational lifecycle

Vercel schedules four daily `GET` handlers in `gru1`: abandoned-cart processing, stock alerts, future-sale notices, and expired stock-reservation cleanup. Each checks `Authorization: Bearer $CRON_SECRET`; their `POST` fallback accepts the Asaas webhook token for a manual or external scheduler. They use service role and record cron observability events.

The abandoned-cart worker processes carts idle for at least an hour with no reminder. A successful email, or a terminally undeliverable recipient, marks the reminder complete; an ordinary email failure leaves it eligible for retry. WhatsApp is best effort. The reservation-expiry tick is cleanup, not the stock-consistency guarantee: `checkout_criar_pedido` expires a product reservation before deciding availability, so a stalled cron can only make storefront stock conservative. Future-sale notices are idempotent through recorded alert keys and only record a key after at least one recipient receives the message.

Collective-purchase ticking has no Vercel schedule declaration. An external scheduler or manual caller must send the Asaas bearer token; it advances collective stages and records success or failure. `GET /api/observabilidade/cron` independently requires `CRON_SECRET` before returning persisted cron events.

## MCP partner service

`mcp-server/` is a separate TypeScript/Express package. Its standalone entrypoint listens on `HOST` and `PORT` with defaults `0.0.0.0:3333`; its Vercel entrypoint re-exports the built Express app. It exposes stateless Streamable HTTP `POST /mcp`, `GET /health`, and rejects `GET` and `DELETE /mcp`.

Every protocol request must carry an `i24_` Bearer token. The service hashes that token and validates it through `api_validar_token`, which supplies the partner key, store, and scope context. It builds and closes a fresh MCP server and transport per request. When `ALLOWED_HOSTS` is configured, the transport enables DNS-rebinding protection.

MCP's service-role client is an integration boundary distinct from web sessions. Read exposure is limited to a fixed table enumeration and registered tools. Writes need both a `write`-scoped partner token and an enabled module in `MCP_WRITE_ENABLED`; mutations constrain product, order, and delivery changes to the token store, and `api_registrar_uso` records both success and failure.

`industria24_finalizar_compra` deliberately combines two principals: the partner token authorizes use of the tool, while a separate buyer Supabase access token is used with an anon client to authenticate the actual buyer. It groups items by store, invokes `checkout_criar_pedido` for each group, and returns order URLs. It does not create an Asaas charge.

## Operations dashboard

`dashboard-ops/` is an independent Next.js deployment, not an in-marketplace admin panel. Its browser page polls its own GitHub, Vercel, Sentry, and cron routes every 30 seconds. Those server routes contact their provider or marketplace dependency and return JSON errors when upstream work fails.

The dashboard cron route forwards its `CRON_SECRET` to `https://industria24.com.br/api/observabilidade/cron`, where the marketplace independently checks the same secret before querying stored events. This is a cross-deployment machine credential, not a browser or Supabase login. The dashboard routes shown here do not apply viewer authentication themselves; deploy them behind an appropriate access boundary before exposing operational data.

`GET /api/push-metrics` reads the dashboard's GitHub, Vercel, and Sentry views with no cache, turns available values into named metrics, and pushes them to Grafana Prometheus remote write using configured credentials. It is an operations integration with side effects, not a marketplace API.

## Safe change checklist

1. Identify the caller first: browser session, public read, provider callback, Vercel cron, external scheduler, MCP partner, buyer token, or operations dashboard.
2. Keep domain rules in the owning module and testable `src/lib/<module>/` code; keep pages, Server Actions, and Route Handlers as UI or transport adapters.
3. Use the least privileged Supabase client. Preserve RLS for user work and reserve service role for trusted callbacks, ticks, and system writes.
4. For provider callbacks, authenticate the caller and validate its association with durable records before mutation. Preserve the payment-first/best-effort-follow-up ordering.
5. Do not expand MCP into arbitrary database access. Add fixed tools, module and scope gates, store ownership constraints, and audit registration.
6. Run root `npm run lint`, `npm run build`, and `npm run test`; run `npm run build` in `mcp-server`; and run `npm run lint` and `npm run build` in `dashboard-ops`. Focused Vitest coverage verifies freight precedence/math, timing-safe tokens, and fail-closed WhatsApp HMAC validation.

## Related pages

- [Data access, security, and schema evolution](/openwiki/architecture/data-access-security-and-schema-evolution.md)
- [Marketplace catalog and roles](/openwiki/concepts/marketplace-catalog-and-roles.md)
- [External services and webhooks](/openwiki/integrations/external-services-and-webhooks.md)
- [Runtime configuration and observability](/openwiki/operations/runtime-configuration-and-observability.md)
- [Quickstart](/openwiki/quickstart.md)
