---
type: integration contract
title: External Services and Webhooks
description: Contracts for payment, delivery, messaging, email, address, anti-bot, and observability providers. Documents trusted callbacks, local reconciliation before state changes, configuration, degraded modes, and owner call sites.
tags: [integrations, webhooks, payments, logistics, messaging, observability, security]
verified:
  - by: openwiki/0.4.3
    at: 2026-09-23T13:24:35.866Z
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-50a18d054b596a7ed0eeffb0
    resource: repo://next.config.ts
  - id: openwiki-source-ec0901436e70c8298e1e4c7a
    resource: repo://sentry.edge.config.ts
  - id: openwiki-source-479c81b7b82cda7e56624c81
    resource: repo://sentry.server.config.ts
  - id: openwiki-source-9b5212d30cf3db12db954fa8
    resource: repo://src/app/api/asaas/webhook/route.ts
  - id: openwiki-source-d9643398059a309f0d4eb206
    resource: repo://src/app/api/bot/whatsapp/webhook/route.ts
  - id: openwiki-source-50f557018cfe2dc589c33d23
    resource: repo://src/app/api/webhooks/bubblewhats/route.ts
  - id: openwiki-source-a74c23e71678a8deecc4a333
    resource: repo://src/app/api/webhooks/uber-direct/route.ts
  - id: openwiki-source-008342822ba803302ac387dd
    resource: repo://src/app/checkout/actions.ts
  - id: openwiki-source-d53a8e1d62a537c16a54cfcb
    resource: repo://src/app/pedido/%5Bid%5D/actions.ts
  - id: openwiki-source-3989cc5e02301bf858a30a2e
    resource: repo://src/components/TurnstileWidget.tsx
  - id: openwiki-source-9c932b0111282deca68f917f
    resource: repo://src/instrumentation-client.ts
  - id: openwiki-source-2dcb4ef15a24888e2bf6e8b3
    resource: repo://src/instrumentation.ts
  - id: openwiki-source-2cbc059c30443b1e7749fbce
    resource: repo://src/lib/asaas-confirmar.ts
  - id: openwiki-source-9de0883f0a0908bbfe5d2280
    resource: repo://src/lib/asaas.ts
  - id: openwiki-source-6f7781331b9cf6b543bf1896
    resource: repo://src/lib/auth-actions.ts
  - id: openwiki-source-5e0e8e5189db4568aafd2f49
    resource: repo://src/lib/bubblewhats.ts
  - id: openwiki-source-3606215f7a68a9db4f8d5ab4
    resource: repo://src/lib/cep.ts
  - id: openwiki-source-ce9026e5cd1da104f2fba561
    resource: repo://src/lib/email.ts
  - id: openwiki-source-b12ffa3e6665236f966d3cbf
    resource: repo://src/lib/geo.ts
  - id: openwiki-source-a35f8a682526639a2ef6c2c8
    resource: repo://src/lib/repasses.ts
  - id: openwiki-source-7c05722a4c860de6df829ceb
    resource: repo://src/lib/token-timing-safe.ts
  - id: openwiki-source-fccf4d3196316a09d870a987
    resource: repo://src/lib/turnstile-flag.ts
  - id: openwiki-source-403e37f37443252970284cde
    resource: repo://src/lib/turnstile.ts
  - id: openwiki-source-464d59649a7194c9d1a37c6d
    resource: repo://src/lib/uber-direct.ts
  - id: openwiki-source-1157b9217ee287d146705aec
    resource: repo://src/lib/whatsapp-webhook-signature.ts
  - id: openwiki-source-f532973f75631e4456936ff5
    resource: repo://src/lib/whatsapp.ts
generated: { by: "openwiki/0.4.3", at: "2026-09-23T13:24:35.866Z" }
---

# External Services and Webhooks

Supabase owns marketplace state. External providers may report payment or delivery facts, transport messages, calculate route data, mitigate bots, or receive telemetry; they do not authorize a state change merely by responding or calling back. In particular, a payment callback must pass endpoint authentication and local order/charge/value reconciliation before `pedidos` and `linha_itens` change. Post-persistence messages, email, routing, and telemetry are best effort and must not reverse the durable transition.

## Configuration and operating posture

The checked-in `.env.example` currently contains only comments, so it is not a usable inventory of runtime configuration. Provision integration variables through the deployment environment, keep all credentials server-side, and treat the following as the implementation contract:

| Integration | Configuration and boundary | Disabled or failure behavior |
| --- | --- | --- |
| Asaas | `ASAAS_API_KEY`; `ASAAS_ENV=production` selects production and every other value selects sandbox. `ASAAS_WEBHOOK_TOKEN` authenticates `/api/asaas/webhook`. | No key means no charge is simulated. Requests have a 12-second abort deadline and errors reach the calling checkout flow. |
| Uber Direct | `UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_CLIENT_ID`, and `UBER_DIRECT_CLIENT_SECRET` enable delivery creation. `UBER_DIRECT_WEBHOOK_SIGNING_KEY` is a separate callback signing key. | Delivery fallback is off without all OAuth credentials. **Production gap:** an absent callback signing key makes the current handler accept callbacks; install the per-endpoint Uber signing key. |
| Meta WhatsApp | `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID` send messages. `WHATSAPP_VERIFY_TOKEN` handles subscription GET; `WHATSAPP_APP_SECRET` validates POST bodies. | Send returns `false` when unconfigured or the normalized number is too short; inbound POST fails closed without a valid App Secret signature. |
| BubbleWhats | `BUBBLEWHATS_TOKEN` and `BUBBLEWHATS_API_URL` send; `BUBBLEWHATS_WEBHOOK_SECRET` protects inbound observation. | Explicit result codes distinguish no configuration and provider failures. The inbound route does not mutate application state. |
| Resend | `RESEND_API_KEY`; optional `RESEND_FROM`. | Returns an unsent result without a key; reserved/test recipient domains are terminal non-deliverable results, not retryable sends. |
| ViaCEP and Google | ViaCEP needs no key. Google accepts the first nonblank of `GOOGLE_MAPS_API_KEY` and legacy `GOOGLE_MAPS_API`; `GEO_MAX_CHAMADAS_DIA` defaults to 5000. | CEP lookup returns `null`; route/geocoding operations return typed failures rather than fabricated data. |
| Turnstile | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is browser-visible; `TURNSTILE_SECRET_KEY` is server-only. | The current `TURNSTILE_ATIVO` kill switch is `false`: no widget or verification call runs and all checks accept. Re-enable the flag before relying on either key as a gate. |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN` enables SDK initialization. `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` support build-time source-map upload. | No DSN is a no-op; monitoring must never gate a business action. |

## Asaas: payment creation, authenticated confirmation, and settlement

`src/lib/asaas.ts` is server-only. It finds or creates a customer after validating an 11- or 14-digit CPF/CNPJ, creates PIX, boleto, or hosted-card payments with `pedidoId` as `externalReference`, and uses a due date three days ahead. PIX QR data is retrieved separately; hosted billing means card details do not traverse this application. Its separate `createPixTransfer` is seller/affiliate settlement, not a payment split.

The normal confirmation entrypoint is `POST /api/asaas/webhook`. It timing-safely checks `asaas-access-token`, requires service-role configuration, parses the event, and delegates only paid or cancellation-class events. Invalid authentication is 401; unavailable service role is 500. Invalid JSON, incomplete events, unsupported events, and reconciliation rejects are deliberately acknowledged as ignored, avoiding provider retry loops while never crediting an untrusted payment.

The buyer-facing fallback `verificarPagamento` is intentionally not polling: it reads only the caller-visible `pedidos_cliente` row, checks the stored charge with Asaas, accepts only `RECEIVED` or `CONFIRMED`, and is limited once per order per 15 seconds. Both paths converge on `confirmarPagamentoPedido`.

```mermaid
sequenceDiagram
    participant Asaas
    participant Hook as Asaas webhook
    participant Confirm as Payment confirmation
    participant DB as Supabase
    participant Effects as Notices and dispatch
    Asaas->>Hook: event and access token
    Hook->>Hook: timing safe token check
    alt paid event
        Hook->>Confirm: reference payment ID value date
        Confirm->>DB: load order and reconcile
        alt matching unpaid order
            Confirm->>DB: persist payment and line items
            Confirm->>Effects: best effort follow up
        else mismatch or already recorded
            Confirm-->>Hook: reject or no operation
        end
    else cancellation event
        Hook->>DB: cancel and restore stock
        Hook->>Effects: best effort cancellation email
    else incomplete or unsupported
        Hook-->>Asaas: acknowledge ignored
    end
    Hook-->>Asaas: JSON ok
```
This sequence shows that endpoint authentication alone is insufficient: the local charge and amount checks authorize the payment transition.

The core first treats a non-null `dt_pagamento` as an idempotent no-op. For a new payment it requires the callback payment ID to equal `asaas_cobranca_id` and its value to be at least `valor_pedido`. Its conditional `dt_pagamento IS NULL` update closes the concurrent webhook/manual-check race; only the writer that updates the order marks line items paid and begins follow-up work. It records the received value and payment date. Cancellation events call `pedido_cancelar_devolver_estoque` before requesting cancellation email.

After persistence, buyer and seller notifications, status email, internal dispatch, and eligible Uber fallback are isolated as best effort; failures are captured rather than undoing payment. The buyer receives the pickup/delivery code through BubbleWhats, whereas the seller’s Meta notification intentionally excludes it. Seller/affiliate PIX transfers have a separate durable claim: a `repasses` row must transition from `pendente` to `processando` before the Asaas transfer call; competing retries that claim no row do not transfer again, and exceptions mark that repasse `falhou`.

## Uber Direct: fallback delivery and callback lifecycle

Post-payment dispatch first tries the internal `corridas` RPC. It stores null distance/duration when Google Routes fails but retains a keyless Google Maps link. Uber Direct is considered only where no internal run exists (or the line explicitly selected Uber), the order is not consolidated freight, delivery address data exists, and the store pickup address is complete. The client obtains and in-process caches an OAuth client-credentials token, quotes before creating a delivery, sends Brazilian addresses as unstructured strings and contacts in E.164, then persists the returned delivery ID, status, tracking URL, and quoted fee in `rotas`.

Register `https://industria24.com.br/webhooks/uber-direct`; Next rewrites it to `/api/webhooks/uber-direct`. When `UBER_DIRECT_WEBHOOK_SIGNING_KEY` is configured, the raw body requires timing-safe HMAC-SHA256 verification of `x-uber-signature`. This signing key is not the OAuth client secret. The implementation currently returns true if the signing key is absent, so an unconfigured deployment has an unauthenticated state-changing callback and must be remediated rather than treated as trusted.

```mermaid
sequenceDiagram
    participant Uber
    participant Hook as Uber webhook
    participant DB as Supabase routes
    participant Alert as Buyer notice
    Uber->>Hook: raw event and signature
    alt signing key configured
        Hook->>Hook: verify HMAC SHA256
        alt invalid signature
            Hook-->>Uber: 401 unauthorized
        else valid signature
            Hook->>DB: update by delivery ID
        end
    else signing key absent
        Note over Hook: current handler accepts request
        Hook->>DB: update by delivery ID
    end
    opt mapped in transit
        Hook->>Alert: send out for delivery notice
    end
    Hook-->>Uber: JSON ok
```
This sequence shows the configuration-dependent trust boundary and that the route update precedes the out-for-delivery notice.

The handler locates the route by `uber_delivery_id`, always records raw `uber_status`, saves a supplied tracking URL, and maps `pending`/`pickup` to `Atribuida`, `pickup_complete`/`in_transit` to `EmTransito`, and `delivered` to `Entregue`. It captures database update errors but acknowledges the provider. There is no provider-event-ID deduplication, so retries can repeat the update and the `EmTransito` notification attempt. The notice is awaited after persistence; changing this endpoint should catch downstream notification failure if acknowledgement reliability is required.

## Messaging, email, and support channels

Meta sending normalizes to Brazilian country code `55` and posts text to Graph API v21.0. Its support webhook GET returns `hub.challenge` only for the configured verify token. POST validates the raw body as `sha256=<hex>` using `WHATSAPP_APP_SECRET` before parsing; an absent secret, absent signature, altered body, or wrong signature is rejected.

After signature validation, the support route acknowledges without processing if service-role access or the AI bot is unavailable. It finds an open `bot_conversas` row by normalized phone or creates one. An entered contact may identify a user, but sensitive order tools require both that `cliente_id` and the saved `telefone_contato` to normalize to the sender. Thus a callback, an email typed in chat, or an AI result alone cannot disclose someone else’s order.

BubbleWhats is a distinct shared-device client limited to `POST /send-message`; it never configures the device, plan, or webhook. Its inbound endpoint requires a timing-safe query-string secret, logs message/message-status events, and sends device status to Sentry. It is observation only. Resend sends text plus optional HTML to its REST endpoint. `notificarMudancaStatusPedido` is the centralized status-mail boundary: it supports four order statuses, obtains the buyer email through the service client, and catches all errors, so email cannot reverse a persisted status.

## Address, bot mitigation, and observability

`buscarEndereco` accepts exactly eight cleaned CEP digits and maps a successful ViaCEP response to normalized fields; callers must allow manual completion on `null`. Google Routes, CEP geocoding, and reverse geocoding are server-only and share a per-process, per-day counter. They return explicit `nao_configurado`, quota, no-result/no-route, or provider-unavailable results. The 5000-call default is a per-instance loop/cost brake, not a durable global serverless quota. `linkTrajeto` is pure and needs no key.

Turnstile call sites still pass the first `x-forwarded-for` address from checkout/login/registration to `verificarTurnstile`. If the kill switch is turned on and a secret is present, missing/rejected tokens plus Cloudflare HTTP/network failures reject the request after an eight-second timeout; with no secret, verification deliberately returns true. At present, however, the false kill switch short-circuits before all of those cases, including widget rendering. The focused test asserts this disabled contract; restore active-path tests when re-enabling.

Sentry initializes client, Node, and Edge with default PII sending disabled. The browser bridge queues up to ten early errors and dynamically loads the SDK on idle or error; replay masks all text and blocks media. Client trace sampling defaults to 0.1; Node and Edge default to 1. `next.config.ts` supplies static browser security headers, the proxy emits per-request CSP, and Sentry build configuration can upload source maps without making runtime telemetry mandatory.

## Safe changes and focused tests

1. Preserve raw-body validation before parsing and use local identity/value/ownership checks before any state mutation. A delivery quote, an AI response, an unauthenticated callback, or a third-party success response is not authorization.
2. Extend payment confirmation in `confirmarPagamentoPedido`, rather than independently in the webhook and manual fallback. Retain the conditional write and all reconciliation checks.
3. Treat absent integration configuration according to its specific contract: no Asaas charge, no Uber fallback, typed Maps failure, no-op message/email result, or—in the current Uber callback and Turnstile cases—a security risk/intentional disablement requiring explicit operational action.
4. Keep provider follow-up after durable payment/route writes and instrument failure without rolling back marketplace state. Decide explicitly whether callback notification errors need catching before the provider response.
5. Run focused boundary tests: `src/lib/whatsapp-webhook-signature.test.ts` covers valid and invalid Meta HMAC cases; `src/lib/turnstile.test.ts` asserts the current kill-switch behavior; `src/lib/uber-direct.test.ts` covers E.164 normalization; `src/lib/bubblewhats.test.ts` covers explicit result classification; and `src/lib/geo.test.ts` guards against fabricated route metrics.

For adjacent ownership and lifecycle detail, see [data access, security, and schema evolution](../architecture/data-access-security-and-schema-evolution.md), [checkout payment and order lifecycle](../workflows/checkout-payment-and-order-lifecycle.md), [fulfillment and logistics](../workflows/fulfillment-and-logistics.md), [AI assistance and customer channels](ai-assistance-and-customer-channels.md), and [runtime configuration and observability](../operations/runtime-configuration-and-observability.md).
