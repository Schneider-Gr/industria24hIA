---
type: operations guide
title: Runtime Configuration, Scheduling, and Observability
description: Operating guidance for the marketplace runtime, scheduled work, failure reporting, and the payout-ledger reconciliation required after a crash or an uncertain Asaas transfer. Covers server-only credentials and the read-only admin ledger.
tags: [runtime-configuration, deployment, security, observability, scheduled-work, sentry, payouts]
verified:
  - by: openwiki/0.4.3
    at: 2026-08-28T19:56:09.348Z
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-b3540f0c22103fdf5e95b196
    resource: repo://dashboard-ops/app/api/cron/route.ts
  - id: openwiki-source-16a74fc866f7995096536beb
    resource: repo://dashboard-ops/app/api/github/route.ts
  - id: openwiki-source-afd69f840dde1b9aa9741501
    resource: repo://dashboard-ops/app/api/push-metrics/route.ts
  - id: openwiki-source-40e37a0cf3497613950e449c
    resource: repo://dashboard-ops/app/api/sentry/route.ts
  - id: openwiki-source-be00ca561ef9c9f699f0b079
    resource: repo://dashboard-ops/app/api/vercel/route.ts
  - id: openwiki-source-625e2135e33e3cb47ff6220b
    resource: repo://dashboard-ops/app/page.tsx
  - id: openwiki-source-362bdc4dcecf2db92b3e5829
    resource: repo://dashboard-ops/vercel.json
  - id: openwiki-source-669c6b5d119a0cd3142bce3e
    resource: repo://mcp-server/.env.example
  - id: openwiki-source-98bbd73cd806fcee501c934f
    resource: repo://mcp-server/api/index.js
  - id: openwiki-source-bf1eced407d3838c6eff15ac
    resource: repo://mcp-server/src/app.ts
  - id: openwiki-source-c8f0ed424254dd3505e45773
    resource: repo://mcp-server/src/auth.ts
  - id: openwiki-source-df02f89d9e676cd0fbcf495c
    resource: repo://mcp-server/src/server.ts
  - id: openwiki-source-db5710099586adaf363ea421
    resource: repo://mcp-server/src/supabase.ts
  - id: openwiki-source-6711ed283b036f501a835699
    resource: repo://mcp-server/vercel.json
  - id: openwiki-source-50a18d054b596a7ed0eeffb0
    resource: repo://next.config.ts
  - id: openwiki-source-ec0901436e70c8298e1e4c7a
    resource: repo://sentry.edge.config.ts
  - id: openwiki-source-479c81b7b82cda7e56624c81
    resource: repo://sentry.server.config.ts
  - id: openwiki-source-5b73e35c464e6917055dae35
    resource: repo://src/app/(admin)/admin/repasses/page.tsx
  - id: openwiki-source-313d1f7ecc965e3182223b61
    resource: repo://src/app/(afiliado)/afiliado/logistica/actions.ts
  - id: openwiki-source-7aa876b27c73ecb8d9ba83a5
    resource: repo://src/app/(parceiro)/parceiro/actions.ts
  - id: openwiki-source-fd7543c7075b5735aca8624e
    resource: repo://src/app/(seller)/seller/pedidos/actions.ts
  - id: openwiki-source-9b5212d30cf3db12db954fa8
    resource: repo://src/app/api/asaas/webhook/route.ts
  - id: openwiki-source-7dfffdf57033009713d121ed
    resource: repo://src/app/api/carrinho/abandono/tick/route.ts
  - id: openwiki-source-2109917ffe6818340a98eec6
    resource: repo://src/app/api/coletivas/tick/route.ts
  - id: openwiki-source-1ff4d84c7f265ad7e31387b2
    resource: repo://src/app/api/observabilidade/cron/route.ts
  - id: openwiki-source-a74c23e71678a8deecc4a333
    resource: repo://src/app/api/webhooks/uber-direct/route.ts
  - id: openwiki-source-f5e7b736524aac830f35dfed
    resource: repo://src/app/entregador/actions.ts
  - id: openwiki-source-9c932b0111282deca68f917f
    resource: repo://src/instrumentation-client.ts
  - id: openwiki-source-2dcb4ef15a24888e2bf6e8b3
    resource: repo://src/instrumentation.ts
  - id: openwiki-source-11976d1dd2d9170120dafd0a
    resource: repo://src/lib/api/erro-generico.ts
  - id: openwiki-source-2cbc059c30443b1e7749fbce
    resource: repo://src/lib/asaas-confirmar.ts
  - id: openwiki-source-9de0883f0a0908bbfe5d2280
    resource: repo://src/lib/asaas.ts
  - id: openwiki-source-0fc60f122c17d51dd0c958bc
    resource: repo://src/lib/observabilidade/registrar-evento.test.ts
  - id: openwiki-source-3f7aea3c5d2b2415f2160d83
    resource: repo://src/lib/observabilidade/registrar-evento.ts
  - id: openwiki-source-a35f8a682526639a2ef6c2c8
    resource: repo://src/lib/repasses.ts
  - id: openwiki-source-f1d08304c0a697b987c60b1a
    resource: repo://src/lib/sentry-context.ts
  - id: openwiki-source-84fe5c4ea822f9abed688266
    resource: repo://src/lib/supabase/service.ts
  - id: openwiki-source-8614960a069b26689aec72db
    resource: repo://supabase/migrations/0111_repasse_automatico_confirmacao_entrega.sql
  - id: openwiki-source-c0c0205f68c726703081d6a6
    resource: repo://supabase/migrations/0125_observabilidade_eventos.sql
  - id: openwiki-source-0585b703835f6358f5f665dd
    resource: repo://supabase/migrations/0151_repasse_status_processando.sql
  - id: openwiki-source-55831e92f29f8b3e9d43f58b
    resource: repo://vercel.json
generated: { by: "openwiki/0.4.3", at: "2026-08-28T19:56:09.348Z" }
---

## Scope and deployment boundaries

This repository contains three independently configured deployments:

- The repository root is the Next.js marketplace. It owns browser/server configuration, marketplace routes, the public Uber webhook rewrite, and the abandoned-cart Vercel cron.
- `mcp-server/` is a separate Express Streamable HTTP MCP service. Its Vercel configuration builds it independently and rewrites all paths to the Express function entrypoint.
- `dashboard-ops/` is a separate Next.js operations dashboard. It proxies protected marketplace cron history and schedules its own metrics push.

For local marketplace development, copy `.env.example` to `.env.local` and never commit it. `NEXT_PUBLIC_*` values are browser-visible: public Supabase URL and anon key are client inputs, while service-role keys, bearer tokens, and provider credentials belong only in server deployment configuration. The repository does not track a `dashboard-ops/.env.example`; derive that deployment's secrets from its route implementations.

| Area | Configuration | Operational boundary |
| --- | --- | --- |
| Browser Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public inputs; authorization relies on Supabase/RLS, not credential secrecy. |
| Privileged marketplace access | `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Required by privileged payment, payout, tick, and observability paths. |
| Asaas | `ASAAS_API_KEY`, `ASAAS_ENV`, `ASAAS_WEBHOOK_TOKEN` | Server-only PSP credential, environment selector, and webhook/tick bearer token. |
| Marketplace Sentry | `NEXT_PUBLIC_SENTRY_DSN`, environment and sampling variables | A missing DSN leaves the SDK inert; browser and server sampling settings are distinct. |
| Sentry source-map upload | `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Build-time inputs to `withSentryConfig`; absence warns rather than making runtime unavailable. |
| Scheduled callers | `CRON_SECRET`, `ASAAS_WEBHOOK_TOKEN` | Server-side bearer credentials with endpoint-specific checks. |
| MCP | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `HOST`, `PORT`, `MCP_WRITE_ENABLED`, `ALLOWED_HOSTS` | Separate-service configuration and rollout/security controls. |
| Dashboard providers | GitHub, Vercel, Sentry, `CRON_SECRET`, and Grafana remote-write credentials | Server-side values used only by dashboard routes. |

The marketplace service-role client refuses construction without `SUPABASE_SERVICE_ROLE_KEY` and disables persisted and refreshed auth sessions. It is server-only: never import it into a client component or page. The MCP service likewise exits without its Supabase URL or service-role key; partners authenticate instead with separately validated `i24_` Bearer tokens.

`MCP_WRITE_ENABLED` is a comma-separated rollout gate. A nonempty `ALLOWED_HOSTS` enables DNS-rebinding protection for the stateless Streamable HTTP transport. Each authorized `POST /mcp` gets a server instance; `GET` and `DELETE /mcp` return 405, while `GET /health` is the liveness endpoint.

## Payout lifecycle and reconciliation

A payout is a `repasses` ledger row for a paid-and-delivered order, with a seller or affiliate destination, amount, status, creation time, and optional transfer timestamp. The delivery-confirmation RPC recalculates the ledger only on a real confirmation, not its idempotent “already delivered” return. Seller, logistics-partner, affiliate-logistics, and public-deliverer entrypoints invoke the same best-effort application payout trigger after that confirmation. The public entrypoint first resolves the order by its readable sale ID through the service client.

```mermaid
stateDiagram-v2
  [*] --> pendente
  pendente --> inelegivel: PIX key is not eligible or absent
  pendente --> processando: conditional claim succeeds
  processando --> transferido: Asaas transfer returns
  processando --> falhou: handled transfer error
  processando --> processando: crash or uncertain remote outcome
  falhou --> [*]
  transferido --> [*]
  inelegivel --> [*]
```

This diagram shows the implemented automatic payout states; an operator resolves a stranded or uncertain row outside the current admin UI.

`dispararRepasseAutomatico*()` first recalculates the order ledger and selects **only** `pendente` rows. For each valid seller or affiliate destination it checks the destination's eligibility RPC and PIX key. Ineligible or incomplete-key rows become `inelegivel`. Immediately before `createPixTransfer`, it conditionally changes the specific row from `pendente` to `processando` and proceeds only if that update returned a row. Thus concurrent delivery confirmations, retries, or racing entrypoints cannot issue a second transfer for the same ledger row.

The Asaas transfer uses `POST /v3/transfers` and sends the ledger UUID as `externalReference`; that UUID is the primary reconciliation key. On a returned success, the ledger becomes `transferido`, records `transferido_em`, and seller rows mark the order's item rows transferred. A caught error changes the row to `falhou` and reports the exception to Sentry. The Asaas client has a 12-second request timeout, so a timeout or connection error is not proof that Asaas did not receive or execute the transfer.

### What `processando` means

Migration `0151_repasse_status_processando.sql` adds `processando` to the database status constraint. It is deliberately an intermediate durable claim: it means one execution has won the right to call Asaas and another automatic execution will no longer select the row. If the runtime crashes after the claim, or the outbound transfer has an uncertain outcome, the row can remain `processando`; there is no automatic reset to `pendente`.

The admin page at `/admin/repasses` is a dynamic, **read-only** ledger view. It loads at most 300 newest rows, can filter by status, and shows order sale ID, store, destination, amount, status, and creation date. It includes a distinct `Processando` label, but no reprocess, mark-transferred, or Asaas-control action is implemented there. Do not represent planned actions as available functionality.

### Manual reconciliation runbook

Treat both a stranded `processando` row and a `falhou` row following an ambiguous network/timeout failure as a money-movement incident.

1. Record the ledger UUID, order sale ID, destination, amount, and timestamps from `/admin/repasses`. The ledger UUID is sent to Asaas as `externalReference`.
2. Query Asaas using that reference and the expected amount/destination. Establish whether a transfer was created, completed, pending, rejected, or cannot be determined. Do **not** initiate a replacement transfer merely because the local caller timed out or crashed.
3. Preserve the Asaas evidence (transfer ID/status, time, amount, and lookup result) with the incident. Use Sentry and deployment logs to establish whether the local claim occurred and whether the request failed locally.
4. Escalate the state correction or any intentional retry to an authorized operator with database/Asaas access, after the provider outcome is known. A confirmed provider transfer must be reflected as transferred; a confirmed non-transfer may be eligible for a controlled retry. An unresolved provider result remains an investigation, not an automatic retry.
5. Recheck the order and ledger after resolution. The automatic selector only consumes `pendente`, so a row will remain excluded until an authorized manual resolution changes its state.

This is a manual Asaas reconciliation requirement, not a scheduler backlog. No repository-managed job scans or reprocesses `processando` rows. The status is specifically intended to prevent duplicate payouts while the external outcome is being established.

## Payment confirmation and failure reporting

Asaas payment webhooks authenticate with `asaas-access-token` against `ASAAS_WEBHOOK_TOKEN`, require service-role configuration, ignore malformed/unhandled events with 200, and delegate business confirmation to `confirmarPagamentoPedido()`. A separate manual/fallback payment-verification path converges on that same function when webhook delivery is delayed or unavailable.

Payment confirmation is idempotent on `pedidos.dt_pagamento`, rather than a fixed order-status list. It verifies payment ID and amount, then conditionally records `Pagamento Realizado`, timestamp, and received value only while `dt_pagamento` is null. Only the execution whose conditional update succeeds marks item rows paid and starts notification and dispatch side effects; a competing or replayed event returns already-paid. WhatsApp and post-payment routing failures are captured in Sentry without undoing the recorded payment.

Sentry initializes before browser hydration with default PII collection disabled, configurable tracing/replay sampling, masked replay text/media, feedback integration, and App Router transition breadcrumbs. Server instrumentation chooses Node or Edge configuration from `NEXT_RUNTIME` and registers request-error capture. The explicit user context contains only a user ID and optional role. The generic API error helper captures the real exception in Sentry but returns a generic error response so provider or database messages do not reach callers.

## Scheduled work and telemetry

The root Vercel project schedules daily `GET /api/carrinho/abandono/tick` at `0 12 * * *`. GET requires `CRON_SECRET`; the alternate POST requires `ASAAS_WEBHOOK_TOKEN`; both run the same scan. It requires the service role, selects carts idle for at least one hour with items and no reminder marker, marks a reminder only after email success, and treats WhatsApp as supplementary. It records success, alert, or failure outcomes.

`POST /api/coletivas/tick` has no repository-managed schedule. An external scheduler or authorized caller must send `ASAAS_WEBHOOK_TOKEN` and the deployment must have service-role configuration. It runs collective stages and records success/failure; lazy closure in the read path means a missing tick delays notification rather than moving money.

```mermaid
flowchart TD
  Caller["Vercel cron or external caller"] --> Auth{"Bearer secret valid"}
  Auth -->|no| Unauthorized["401 unauthorized"]
  Auth -->|yes| Handler["Tick route handler"]
  Handler --> Service{"Service role configured"}
  Service -->|no| Unavailable["503 and failure event attempt"]
  Service -->|yes| Work["Scan carts or run collective stages"]
  Work --> Response["Outcome response"]
  Work -. "best effort event" .-> Writer["registrarEvento"]
  Writer --> Store["observabilidade_eventos"]
  Writer -. "configuration or insert failure" .-> LocalLog["console error"]
```

This flow shows that telemetry persistence cannot change the scheduled operation's result.

`registrarEvento()` inserts bounded capability/origin/result records plus optional reason and JSON metadata through the service role. Missing service configuration, insert failures, and exceptions are logged and absorbed. `observabilidade_eventos` has RLS enabled with no policies, an index by capability and descending creation time, and is intended for service-role-only access. The focused test asserts that the writer does not reject when its dependency is unavailable.

`GET /api/observabilidade/cron` requires `CRON_SECRET` and the service role, reads up to 50 newest cron events, and groups them by origin into a latest entry and up to ten historical entries. `dashboard-ops/api/cron` sends its local secret upstream, caches for 20 seconds, returns 500 for missing local configuration, and maps unavailable/error upstream responses to 502. Since event insertion is deliberately non-fatal, a missing event does not prove a cron never ran; use Vercel logs and Sentry too, and alert on both non-success outcomes and stale latest timestamps.

## Dashboard, security, and safe changes

The dashboard polls GitHub, Vercel, Sentry, and cron APIs every 30 seconds, showing cron latest-status/timestamp information alongside unresolved Sentry issues and transaction-latency summaries. Its provider routes use server-side credentials and return local JSON failures independently; Sentry preserves issue data if its optional latency request fails. Its daily `GET /api/push-metrics` fetches provider data and pushes numeric metrics to Prometheus remote write. A non-200/204 push is 502. The route has no application-level authorization check and uses `GRAFANA_PRHOMOTEUS_API_KEY` as the remote-write password.

The marketplace Next configuration applies HSTS, MIME protection, same-origin framing, referrer and permissions policies, and CSP to every route. CSP permits the marketplace, Supabase, Sentry, and Turnstile as needed, but currently retains inline script/style allowances. The nonce proposal is not deployed: do not remove those allowances as a configuration-only change. Preserve the externally registered `/webhooks/uber-direct` rewrite to `/api/webhooks/uber-direct`. With its signing key configured, that handler HMAC-validates `x-uber-signature`, reports invalid signatures to Sentry as warnings, and returns 401; without the key, validation is permissive.

When changing these paths:

1. Keep privileged credentials and bearer secrets server-only. Do not replace a service-role client with an anon client.
2. Preserve the conditional payout claim and `processando` state; any recovery automation needs an explicit provider-reconciliation and idempotency design.
3. Keep `/admin/repasses` read-only unless a separately reviewed control plane, authorization model, audit trail, and provider-outcome safeguards are implemented.
4. Keep ticks authenticated, choose a scheduler deliberately, make repeated work safe, and monitor failures and staleness.
5. Treat dashboard provider/Grafana values as deployment secrets; the current remote-write password variable spelling is `GRAFANA_PRHOMOTEUS_API_KEY`.
6. Run `npm run lint`, `npm run build`, and `npm run test` for marketplace changes; run `npm run build` in `mcp-server`, and `npm run lint` plus `npm run build` in `dashboard-ops`.

## Related pages

- [Data access, security, and schema evolution](/openwiki/architecture/data-access-security-and-schema-evolution.md)
- [External services and webhooks](/openwiki/integrations/external-services-and-webhooks.md)
- [Verification strategy](/openwiki/testing/verification-strategy.md)
- [Checkout payment and order lifecycle](/openwiki/workflows/checkout-payment-and-order-lifecycle.md)
