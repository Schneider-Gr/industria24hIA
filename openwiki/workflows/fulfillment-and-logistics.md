---
type: fulfillment workflow
title: Fulfillment and Logistics
description: Documents freight-option precedence and quote integrity, paid-order dispatch to internal logistics or Uber Direct, partner handoffs, tracking, and delivery completion.
tags: [freight, logistics, delivery, uber-direct, partners, checkout, dispatch]
sources:
  - id: openwiki-source-313d1f7ecc965e3182223b61
    resource: repo://src/app/(afiliado)/afiliado/logistica/actions.ts
  - id: openwiki-source-7aa876b27c73ecb8d9ba83a5
    resource: repo://src/app/(parceiro)/parceiro/actions.ts
  - id: openwiki-source-5199cdb90afeec6b9455c495
    resource: repo://src/app/api/checkout/cotar-frete/route.ts
  - id: openwiki-source-a74c23e71678a8deecc4a333
    resource: repo://src/app/api/webhooks/uber-direct/route.ts
  - id: openwiki-source-008342822ba803302ac387dd
    resource: repo://src/app/checkout/actions.ts
  - id: openwiki-source-f5e7b736524aac830f35dfed
    resource: repo://src/app/entregador/actions.ts
  - id: openwiki-source-2cbc059c30443b1e7749fbce
    resource: repo://src/lib/asaas-confirmar.ts
  - id: openwiki-source-f6fab0728a4fca09af1edf22
    resource: repo://src/lib/checkout/opcoes-frete.test.ts
  - id: openwiki-source-8abe73bc11389bf76cfc82ff
    resource: repo://src/lib/checkout/opcoes-frete.ts
  - id: openwiki-source-b12ffa3e6665236f966d3cbf
    resource: repo://src/lib/geo.ts
  - id: openwiki-source-a35f8a682526639a2ef6c2c8
    resource: repo://src/lib/repasses.ts
  - id: openwiki-source-4cf5369c650ff25ad60e8ba7
    resource: repo://src/lib/uber-direct.test.ts
  - id: openwiki-source-464d59649a7194c9d1a37c6d
    resource: repo://src/lib/uber-direct.ts
  - id: openwiki-source-b1e8ce722f5d11d6bb1b60bc
    resource: repo://supabase/migrations/0039_parceiro_logistico_schema.sql
  - id: openwiki-source-916199116e934b6b1fe23866
    resource: repo://supabase/migrations/0042_rotas_atribuicao_manual.sql
  - id: openwiki-source-6d3a9781e58fc8381da1da2a
    resource: repo://supabase/migrations/0043_despacho_automatico_corridas.sql
  - id: openwiki-source-2f0b4279efd85660c1f55b2c
    resource: repo://supabase/migrations/0074_consolidacao_carga_rota.sql
  - id: openwiki-source-86c5658b09773bb37d9327c5
    resource: repo://supabase/migrations/0090_entregador_confirma_entrega_por_codigo.sql
  - id: openwiki-source-dd627f35a870aa171774b4a3
    resource: repo://supabase/migrations/0102_corrida_revisao_afiliado.sql
  - id: openwiki-source-8614960a069b26689aec72db
    resource: repo://supabase/migrations/0111_repasse_automatico_confirmacao_entrega.sql
  - id: openwiki-source-94553ce19591758e24e735d3
    resource: repo://supabase/migrations/0112_confirmacao_entrega_publica_entregador.sql
  - id: openwiki-source-aa470df720e0d59d4b045bce
    resource: repo://supabase/migrations/0139_uber_direct_transportadora.sql
  - id: openwiki-source-e5e0b9a1b519ce5fa9736d21
    resource: repo://supabase/migrations/0140_checkout_cotacao_uber_direct.sql
  - id: openwiki-source-63ad2ebecc3fb332aca1b599
    resource: repo://supabase/migrations/0148_fix_cotar_frete_tabela_prioridade_loja.sql
  - id: openwiki-source-83c9d16c944e51af5cefed53
    resource: repo://supabase/migrations/0150_checkout_frete_tabela_importada.sql
generated: { by: "openwiki/0.4.3", at: "2026-08-28T19:56:09.348Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-08-28T19:56:09.348Z
---

# Fulfillment and Logistics

Fulfillment starts with a server-authoritative freight choice, not a buyer-posted price. Checkout returns at most one delivery option for the store; once paid, an order either enters the internal `corridas` marketplace, is sent to Uber Direct, waits for a consolidation batch, or is pickup-only. `rotas` records provider/manual route tracking, while `corridas` owns internal run assignment and proof-oriented delivery progression.

For order creation and payment recovery, see [Checkout, Payment, and Order Lifecycle](checkout-payment-and-order-lifecycle.md). Partner and affiliate relationships are covered in [Collective Commerce and Affiliates](collective-commerce-and-affiliates.md); service and webhook conventions are in [External Services and Webhooks](../integrations/external-services-and-webhooks.md).

## Checkout freight selection and integrity

`POST /api/checkout/cotar-frete` authenticates the requester, applies a 20-request-per-minute user limit, and requires a store ID, an eight-digit CEP, and a positive item total. Cart weight is optional and defaults to zero for table matching.

The selection sequence is deliberate:

1. `cotar_frete_tabela` is queried first. It considers active `tabela_importada` carriers and active destination-CEP/weight bands. A band overridden for the store takes precedence over a global one; the current ordering uses `IS NOT DISTINCT FROM` so a `NULL` global `loja_id` cannot win accidentally.
2. If no table band applies, `cotar_frete_interno` finds an active percent-based `faixas_cep` range for a store-local or global internal carrier. It prefers the store range and then the narrowest matching range; the application rounds the percentage charge to two decimals.
3. Only when both internal paths have no coverage does the endpoint attempt Uber Direct. Missing Uber/service-role configuration, incomplete destination or store pickup data, unavailable coverage, provider errors, or failure to persist the result produce an empty option list. Provider failures are reported to Sentry.

`decidirOpcoesFrete` enforces this as a single-option policy: internal beats Uber; Uber is returned only when there is no internal option. The quote request passes its optional cart weight (default `0`) to the table RPC. Order creation currently re-resolves an imported-table price at `0` kg, so the persisted checkout amount is not trusted and quote/create behavior must be changed together when real cart weight is introduced.

```mermaid
flowchart TD
    Request["Buyer requests a freight quote"] --> Valid{"Authenticated request and valid data"}
    Valid -- No --> Reject["Return 401 400 or 429"]
    Valid -- Yes --> Table["Find imported table band"]
    Table --> FoundTable{"Table band found"}
    FoundTable -- Yes --> ReturnTable["Return table option"]
    FoundTable -- No --> Internal["Find internal CEP range"]
    Internal --> FoundInternal{"Internal coverage found"}
    FoundInternal -- Yes --> ReturnInternal["Return percent option"]
    FoundInternal -- No --> Ready{"Uber and address data ready"}
    Ready -- No --> Empty["Return no option"]
    Ready -- Yes --> Quote["Quote Uber and persist quote"]
    Quote --> Saved{"Quote saved"}
    Saved -- Yes --> ReturnUber["Return Uber option and quote ID"]
    Saved -- No --> Empty
    ReturnTable --> Create["Order RPC revalidates table band"]
    Create --> Persist["Persist authoritative freight"]
```

*Freight selection prefers imported-table and percent internal coverage; imported-table freight is revalidated by the order RPC.*

This flow shows precedence and the database-side validation of an imported-table price, rather than a comparison of competing carrier prices.

### External quote boundary

Uber Direct is a global `transportadoras` record with source `uber_direct`. The quote endpoint calls `/delivery_quotes`, persists the store, destination CEP, fee in centavos, duration, and expiry in `cotacoes_frete_externo`, then returns the persisted quote ID. RLS is enabled on that table without direct policies; the endpoint writes through the service client and the checkout RPC is `SECURITY DEFINER`.

At order creation, `finalizarCompra` splits a multi-store cart into one `checkout_criar_pedido` call per store and carries only the selected carrier and external quote ID inside the delivery JSON; it does not send a freight price. The RPC validates the selected carrier against the resolved store. For `uber_direct`, it requires a matching, unexpired saved quote and derives freight from `fee_centavos`; it rejects unavailable carriers, missing or expired quotes, and unsupported `mercado_envios`.

For `tabela_importada`, the RPC calls `cotar_frete_tabela` itself and rejects checkout when no active matching table band exists. It uses that returned value, skips the percent-range path, and therefore remains authoritative even if the browser presents a stale option. For either external or imported-table freight, it allocates rounded proportional charges to all but the last line and assigns the last line the remaining amount. This makes `sum(linha_itens.valor_frete)` exactly equal the order freight; percent freight uses the same remainder treatment. Pickup lines receive no line freight.

## Payment to dispatch

`confirmarPagamentoPedido` is the shared post-payment entry point for the Asaas webhook and the manual/status fallback. It rejects missing orders, mismatched charge IDs, and underpayments. `dt_pagamento` is the idempotency fact: if already set, it returns without notification or dispatch regardless of later order status. A conditional update requiring `dt_pagamento IS NULL` closes the race between concurrent webhook and fallback calls; only the winner marks the order paid and then marks its lines paid. Notifications and routing happen afterward as best effort: failures go to Sentry and do not undo payment.

A line explicitly selecting the fixed Uber Direct carrier prevents creation of an internal run. Otherwise the code calls `despachar_corrida_automatica`; that database function returns an existing run for the order, skips pickup and consolidated freight, or creates a `primeiro_aceita` run. The post-payment Uber routine only continues when no internal run was returned. This lets explicit Uber selection proceed, while avoiding competition with an internal run.

```mermaid
flowchart TD
    Confirm["Confirm payment"] --> Already{"Payment timestamp already set"}
    Already -- Yes --> Stop["Return without side effects"]
    Already -- No --> Persist["Persist payment and paid lines"]
    Persist --> ExplicitUber{"Uber selected at checkout"}
    ExplicitUber -- No --> Dispatch["Call internal dispatch RPC"]
    Dispatch --> InternalRun{"Internal run returned"}
    InternalRun -- Yes --> Partner["Partner or affiliate fulfillment"]
    InternalRun -- No --> Eligible{"Uber eligible"}
    ExplicitUber -- Yes --> Eligible
    Eligible -- Yes --> Uber["Create Uber delivery and route"]
    Eligible -- No --> Deferred["Pickup or deferred fulfillment"]
    Uber --> Webhook["Webhook updates route tracking"]
```

*After the one winning payment confirmation, internal dispatch takes precedence unless checkout explicitly selected Uber Direct; provider dispatch remains best effort.*

The payment gate and `pedido_id` lookup in the dispatch RPC are separate idempotency protections. They should remain intact when adding retry mechanisms.

### Internal runs and consolidation

For a regular delivery, the automatic RPC creates an order-backed `corridas` record using the store pickup and first delivery address. It uses the sum of delivery-line freight for both suggested and final price, a schema-required placeholder of `1` kg, and a four-hour collection window. The first approved logistics affiliate for the store receives a five-minute exclusive window when one exists.

Consolidated freight is intentionally deferred. Checkout reduces each eligible line freight to 70%, adjusts the order total by the cent-accurate difference, and flags the order. `criar_lote_consolidacao` is an admin-only, manual-assisted batch operation: it needs at least two selected paid consolidated orders, all from one store, not already assigned to another run/batch, and with a shared three-digit destination-CEP corridor. It creates one manifest `corridas` record priced at the sum of the discounted freight and attaches the orders to `lote_pedidos`. An admin can cancel an uncollected batch run to release its orders for a new batch.

Route geometry is supplementary to dispatch. `calcularTrajeto` invokes Google Routes only with `GOOGLE_MAPS_API_KEY` and while its per-process daily counter is below `GEO_MAX_CHAMADAS_DIA` (default 5000). It returns named failure states rather than inventing distance or duration; `linkTrajeto` still provides a Google Maps directions URL without a key.

## Partner handoff and internal completion

`parceiros_logisticos` is the platform driver/carrier profile. New profiles start `Pendente`; only an administrator can approve or suspend them. The profile save action requires acceptance of the current logistics-partner terms on its first save and preserves that acceptance on later edits. Only approved partners appear in the limited public profile view.

For a published first-accept run, RLS makes an approved store logistics affiliate's exclusive run visible to that affiliate during the five-minute window; after expiry, approved platform partners can see it. `aceitar_corrida` locks the run, verifies that it remains `Publicada` and `primeiro_aceita`, applies the exclusivity and eligibility rules, and records the assignment/audit event atomically. If an affiliate review is required, that affiliate must first revise weight, volume, window, and description. A non-order run can instead use `leilao`: approved partners upsert one bid each and the requester chooses the winning bid.

Internal run progress is constrained to `Aceita` → `Coletada` → `EmTransito` → `Entregue` and is authorized for the assigned partner or affiliate. Order-backed completion invokes `pedido_confirmar_entrega` before the status update, so a wrong buyer code cannot advance the run. A valid code marks every line delivery `Entregue`, resets code attempts, recalculates the payout ledger, and is idempotent for an already complete order. A photo is optional for an order-backed run but remains required to complete a standalone run. Seller payout transfer is then best effort: failure is recorded without reversing confirmed delivery. Entering `EmTransito` triggers a buyer notification after the status change.

The automatic payout handler recalculates pending seller and affiliate ledger entries after delivery. Before calling Asaas for a PIX transfer, it conditionally claims each entry from `pendente` to `processando`; concurrent retries that do not claim a row make no transfer. Missing or ineligible PIX details mark the entry `inelegivel`; transfer errors mark it `falhou` and are sent to Sentry for admin handling.

There is also a public completion path for a third-party deliverer without a platform login. It accepts an order sale ID, buyer code, and deliverer name; it uses the same paid-order, idempotency, line-delivery, attempt-reset, and payout-ledger semantics. Unlike the authenticated seller exception, this anonymous path enforces the five-attempt cap for every caller and audits both incorrect and successful attempts with the supplied name.

## Uber Direct and route tracking

The server-only Uber client is enabled only when `UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_CLIENT_ID`, and `UBER_DIRECT_CLIENT_SECRET` are all set. It obtains an OAuth `client_credentials` token for `eats.deliveries` and caches it in-process with a five-minute expiry margin. It formats pickup/dropoff addresses as unstructured strings and normalizes local Brazilian phone values to E.164 before creating a delivery.

Post-payment Uber dispatch obtains a fresh provider quote, creates the delivery with the order UUID as `external_id`, then inserts `rotas` with the provider ID, provider status, tracking URL, fee, and internal `Atribuida` status. Missing delivery/pickup data, consolidated freight, disabled configuration, or a pre-existing internal run prevents this path. Dispatch failures are best effort and require operational follow-up for a paid but unassigned order.

The public Uber webhook URL is rewritten to `/api/webhooks/uber-direct`. The handler uses the service client to locate `rotas` by `uber_delivery_id`, stores the raw provider status and any tracking URL, and maps `pending`/`pickup` to `Atribuida`, `pickup_complete`/`in_transit` to `EmTransito`, and `delivered` to `Entregue`. The in-transit buyer notice is after persistence and does not block the update. With `UBER_DIRECT_WEBHOOK_SIGNING_KEY`, it verifies the raw body and `x-uber-signature` with HMAC-SHA256 and timing-safe comparison. Without that key, verification is bypassed; production must configure the endpoint-specific Uber signing key.

Manual `rotas` have the shorter `Atribuida` → `EmTransito` → `Entregue` transition path and can be updated only by their assigned affiliate or partner. Unlike an order-backed `corridas` completion, this route-status RPC does not validate a buyer code.

## Operations and focused verification

- Treat saved-quote store ownership, expiry, carrier activity, and internal-first selection as checkout integrity boundaries. A new carrier source needs both quote behavior and an authoritative `checkout_criar_pedido` branch.
- Maintain payment/dispatch idempotency. A retry must not create a second internal run or replace a saved external price with a client value.
- Configure `UBER_DIRECT_CUSTOMER_ID`, `UBER_DIRECT_CLIENT_ID`, `UBER_DIRECT_CLIENT_SECRET`, and the separate `UBER_DIRECT_WEBHOOK_SIGNING_KEY`. Monitor Sentry events tagged for `logistica`, `uber_direct`, and `roteirizacao_pos_pagamento` for paid-but-undispatched orders.
- Configure `GOOGLE_MAPS_API_KEY` and optionally `GEO_MAX_CHAMADAS_DIA` only for route metrics; absence must not block dispatch.
- `src/lib/checkout/opcoes-frete.test.ts` tests percentage rounding, centavos conversion, internal precedence, Uber fallback, and no coverage. `src/lib/uber-direct.test.ts` tests Brazilian E.164 normalization, formatted input, existing country code, and empty values. Database changes should additionally exercise quote expiry/ownership, concurrent acceptance, repeated dispatch, consolidation eligibility, and valid/invalid buyer-code completion. See [Verification Strategy](../testing/verification-strategy.md) for broader guidance.
