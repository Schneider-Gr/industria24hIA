---
type: commerce workflow
title: Collective Commerce, Future Sales, and Affiliates
description: Collective purchase and future-sale offers, their authoritative checkout and inventory boundaries, affiliate and logistics affiliation, and the delivery-gated payout path.
tags: [collective-commerce, future-sales, affiliates, commissions, payouts, logistics, supabase]
verified:
  - by: openwiki/0.4.3
    at: 2026-09-23T13:24:35.866Z
sources:
  - id: openwiki-source-a5201fb4d22a31d225febbb9
    resource: repo://src/app/(afiliado)/afiliado/actions.ts
  - id: openwiki-source-3b5b9858d39a3b01826e68ba
    resource: repo://src/app/(seller)/seller/coletivas/actions.ts
  - id: openwiki-source-b61c8fae5277ae144c786fb4
    resource: repo://src/app/api/venda-futura/avisos/tick/route.ts
  - id: openwiki-source-008342822ba803302ac387dd
    resource: repo://src/app/checkout/actions.ts
  - id: openwiki-source-00dd76320546b2afebf1d540
    resource: repo://src/app/coletiva/actions.ts
  - id: openwiki-source-2323877adc4e4292eb67e722
    resource: repo://src/app/compra-coletiva/page.tsx
  - id: openwiki-source-8b90f71d82f0b19b8bc0f4ed
    resource: repo://src/lib/afiliado-lote.test.ts
  - id: openwiki-source-15f4828fe43a7d48a82a9bf5
    resource: repo://src/lib/afiliado-lote.ts
  - id: openwiki-source-dc5e96795bb1d17f2a49df44
    resource: repo://src/lib/coletiva-max-participantes.test.ts
  - id: openwiki-source-3280dc4e8d34fe6463829ea5
    resource: repo://src/lib/coletiva.ts
  - id: openwiki-source-a35f8a682526639a2ef6c2c8
    resource: repo://src/lib/repasses.ts
  - id: openwiki-source-1e8a3be1b1f57c7945468147
    resource: repo://src/lib/venda-futura/avisos.ts
  - id: openwiki-source-e4e4b0811054b62c80d27180
    resource: repo://supabase/migrations/0036_perfis_compradores_gate_venda_futura.sql
  - id: openwiki-source-6a501709af33be0e6e193b45
    resource: repo://supabase/migrations/0076_coletiva_regras.sql
  - id: openwiki-source-628118ee47f403270d62fcd7
    resource: repo://supabase/migrations/0077_coletiva_ciclo_vida_rateio.sql
  - id: openwiki-source-20494583e7225dd9d8f91def
    resource: repo://supabase/migrations/0079_logistica_afiliado_produto.sql
  - id: openwiki-source-fe86f330def5e1e1e24ec61f
    resource: repo://supabase/migrations/0080_coletiva_expiracao_pagamento.sql
  - id: openwiki-source-f8f47ac727b9f90dffb0cc93
    resource: repo://supabase/migrations/0129_repasse_automatico_afiliado.sql
  - id: openwiki-source-e5e0b9a1b519ce5fa9736d21
    resource: repo://supabase/migrations/0140_checkout_cotacao_uber_direct.sql
  - id: openwiki-source-6ed80c1f708a1b4857df236f
    resource: repo://supabase/migrations/0155_repasses_seller_afiliado_read.sql
  - id: openwiki-source-4f0d7c137f8aa89569b382c1
    resource: repo://supabase/migrations/0158_repasse_seller_valor_derivado_e_solicitacao.sql
  - id: openwiki-source-b50243a8bcc61c44e30efcbd
    resource: repo://supabase/migrations/0179_venda_futura_no_ledger_e_guardas.sql
  - id: openwiki-source-5f57c1ec6cdd0627507d522c
    resource: repo://supabase/migrations/0189_comissao_por_no_da_arvore.sql
generated: { by: "openwiki/0.4.3", at: "2026-09-23T13:24:35.866Z" }
---

# Collective Commerce, Future Sales, and Affiliates

These programs are additions to the normal catalog, checkout, fulfillment, and payout lifecycle—not alternative money systems. The database owns offer-state, stock, line allocations, and the ledger; server actions shape input and provide user-facing gates. In particular, **sales affiliation**, **platform commission**, and **logistics affiliation** are separate concepts:

- A sales affiliation is a promotable product or store relationship and may produce a line-level affiliate allocation.
- Platform commission is a catalog-taxonomy rate resolved independently for every line.
- A logistics affiliation gives an approved affiliate a short, conditional dispatch opportunity. It is not a sales commission and does not itself create a payout.

For the shared order, payment, delivery, and transfer lifecycle, see [Checkout, Payment, and Order Lifecycle](/openwiki/workflows/checkout-payment-and-order-lifecycle.md). For fulfillment routing, see [Fulfillment and Logistics](/openwiki/workflows/fulfillment-and-logistics.md), and for the stock books see [Inventory Ledger and Warehouse Operations](/openwiki/workflows/inventory-ledger-and-warehouse-operations.md).

## Collective purchases

### Offer configuration and creation

A `coletiva_regras` row is a seller/admin-writable configuration for one product. It supplies active state, a target, participant bounds, a 1–30 day deadline, up to four progressively cheaper quantity lots, and whether freight is shared. The write trigger—not the seller form—requires real discounts, strictly increasing thresholds, strictly decreasing prices, coherent participant bounds, and a target no lower than the first lot. The rule is public to support storefront price-curve display.

`coletiva_criar` rechecks authenticated buyer, approved product, active store, stock, and deadline inputs. It copies the selected rule into `compras_coletivas`, including lots and delivery mode; later edits therefore apply to future offers, not an offer already shared with buyers. If there is no active rule, it can derive a single lot from the product’s current progressive-promotion configuration. A creator may not meet the target alone, and shared freight requires the common delivery address. The Next.js action authenticates, validates the product/quantity/delivery shape, rate-limits each user to five attempts per minute, and calls the RPC rather than calculating price or stock itself.

Joining is a reservation in `coletiva_participacoes`, not an order or stock decrement. The RPC locks the collective, rechecks availability and aggregate stock, and upserts the buyer quantity. A full participant cap rejects a new buyer but permits an existing participant to add quantity.

```mermaid
stateDiagram-v2
    [*] --> Open: collective created
    Open --> Open: participant joins
    Open --> Viable: target participant and store minimum met
    Viable --> Viable: further joins unlock lots
    Open --> Expired: deadline without viability
    Viable --> Reached: deadline cap final lot or owner close
    Reached --> Reached: individual payment or payment expiry
```

This is the intended collective lifecycle encoded by the collective lifecycle migrations: no one is charged while the offer is open, and `Reached` means an individual order exists for each participant.

At an intended viable close, the database locks the offer, chooses the best non-expired attained lot, creates one pending PIX order per participant, debits stock once, and allocates optional shared freight by quantity. It gives rounding remainders to the largest participant, with creation time as the tie-breaker, so order and freight sums exactly reconcile to collective totals. Collective lines have no affiliate allocation; their platform allocation is resolved from the product’s commission configuration.

The payment deadline is stamped on transition to `Atingida`, using the rule’s payment-hours setting or 48 hours. `coletiva_expirar_pagamentos` is serialized and idempotent: after that deadline it cancels only still-pending orders and restores those quantities. Paid orders retain their price and the collective remains closed.

### Current lifecycle implementation caveat

The latest `0189` migration replaces `coletiva_participar` with a different implementation: it accepts only `Aberta`, immediately generates PIX orders and debits stock when the quantity reaches `meta_qtd`, and uses the stored `valor_unitario`. This supersedes the earlier `Viavel`/best-final-lot control flow described above, while the landing page and pure `src/lib/coletiva.ts` mirror still describe the progressive, close-later design. Treat this as a release-blocking contract mismatch when changing collective offers: reconcile the latest SQL function, user-facing copy, and TypeScript mirror before relying on multi-lot progression.

The public detail page is deliberately read-oriented: it obtains the caller’s own participation through authenticated RLS, while public aggregate views expose paid/generated order counts and participant totals without disclosing other buyers. It also renders an expired `Aberta` offer as expired, but that read-side presentation does not itself run financial closure.

## Future sales: business gate, reservation stock, and notices

A future-sale cart line carries `venda_futura_id`. The checkout action detects any such line, requires a corporate/rural-producer profile plus Mercado Futuro terms acceptance, saves the profile through `salvar_perfil_comprador_pj`, and best-effort stamps the acceptance after each resulting order. The authoritative checkout function repeats the essential database gate: a buyer must have a nonblank CNPJ or IE profile. It verifies that the reservation belongs to the selected product, uses its optional price or the product price, decrements `vendas_futuras.estoque` rather than current product stock, and records the reservation ID on the line. Thus this stock is reserved supply, not immediately available warehouse stock.

Future-sale stock changes are mirrored to `estoque_movimentos` with `venda_futura_id`. Those movements remain in the audit extract but are intentionally excluded from physical-center balances and addresses, because promised future supply does not occupy a physical location.

`GET /api/venda-futura/avisos/tick` is the daily Vercel-cron path and requires `Authorization: Bearer $CRON_SECRET`; `POST` instead accepts the Asaas webhook token. With a service-role client, it finds undelivered future-sale lines, derives the date in the `America/Manaus` business timezone, and sends buyer and seller WhatsApp reminders two days before and on the promised date. `alertas_enviados` keys each item and milestone, so a successful recipient suppresses duplicates; an all-recipient failure is not marked and can be retried. The route records cron observability and returns 503 when service configuration is absent.

## Affiliations, attribution, and logistics access

### Enrollment and moderation

A product affiliation request derives store ID, allowed commission, and eligibility from the current product—not form fields—and requires sales-terms acceptance. It starts `Pendente`, stamps the current CMS terms version (or an acceptance-time fallback), and creates a generated identifier. Batch enrollment de-duplicates requested IDs, rereads products and existing affiliations, skips ineligible or already affiliated products, and applies the product percentage or the 5% fallback. The product/store owner may moderate only to `Aprovada` or `Suspensa`; the action provides an owner UX gate but RLS is the final scope boundary. A trigger also prevents a non-admin store/product owner from affiliating themselves.

A store-level request may instead be `tipo='vendas'` or `tipo='logistica'`. Do not interpret `tipo='logistica'` as sales-referral attribution: it is a delivery-routing authorization. On automatic dispatch, an approved logistics affiliation for the order’s store gets a five-minute exclusive window only when every delivered line permits logistics affiliation; a disabled product sends the run directly to the general partner pool. The delivery opportunity begins after a paid order is routed and is unrelated to affiliate sales commission.

### Checkout attribution versus platform commission

The current checkout action captures `?ref=` from `REF_COOKIE` and supplies it as `ref` with freight and buyer-name arguments to `checkout_criar_pedido`. However, the latest SQL definition in migration `0189` declares only the three-argument checkout function and independently selects the most recent approved product/store affiliation for each line. The source tree contains no six-argument definition. This is a material interface and attribution conflict: the action’s RPC request cannot match that latest signature, and the three-argument path shown by the migration reintroduces automatic affiliate selection rather than using the captured reference. Resolve this migration/application mismatch before assuming checkout works or that organic sales receive no affiliate commission.

Platform commission is separate from that defect. `comissao_pct_produto` resolves the nearest explicit taxonomy-node rate first, then subcategory, category, and finally 5%. Checkout snapshots the resolved rate in `linha_itens.repasse_ind_pct`, calculates the platform allocation from the line value, and rejects a line if platform plus selected affiliate percentages exceed 100%. The collective closing functions also call this resolver for their platform allocation, while setting affiliate allocation to zero.

```mermaid
flowchart TD
    Link["Affiliate link ref"] --> Cookie["REF_COOKIE"]
    Cookie --> Action["finalizarCompra"]
    Action --> Rpc["checkout_criar_pedido"]
    Rpc --> Lines["Order lines and stock reservation"]
    Lines --> Delivery["Payment then confirmed delivery"]
    Delivery --> Ledger["Recalculate seller and affiliate ledger rows"]
    Ledger --> Claim["Claim pending payout row"]
    Claim --> Pix["Asaas PIX transfer"]
    LogAff["Approved logistics affiliation"] --> Dispatch["Five minute dispatch opportunity"]
    Lines --> Dispatch
```

This flow distinguishes referral attribution and financial allocation from the later logistics-access decision and the delivery-gated payout.

## Payout dependencies and access

`repasses_recalcular_pedido` derives the seller amount from each line after platform and affiliate allocations, and separately groups positive affiliate allocations by affiliate. Seller and affiliate ledger rows are readable by their respective owner but remain written by privileged ledger functions/admin rather than by dashboard clients. A seller may request ledger recalculation only for its own paid order after every line is confirmed delivered; that is a recovery/control entrypoint, not an early-transfer bypass.

After durable delivery confirmation, `dispararRepasseAutomatico` recalculates the ledger and processes pending seller and affiliate rows independently. It checks beneficiary PIX eligibility, atomically claims `pendente` to `processando`, calls Asaas only for the winning claimant, then marks `transferido`; missing credentials become `inelegivel`, and exceptions become `falhou` with Sentry telemetry. The delivery event is not rolled back for payout failure.

Affiliate PIX data is isolated in `afiliado_dados_pix`: ordinary users have select access to their own row but no generic write policy. `alterar_chave_pix_afiliado` validates key type/format, records an audit event, and clears confirmation. Admin or service-role confirmation followed by 24 hours is required before automatic affiliate payout eligibility.

## Operations and focused verification

- Keep financial authority in SQL RPCs/triggers. UI state, referral cookies, product-card discounts, and client freight values are not financial inputs.
- Before changing collective behavior, test the deployed/latest `coletiva_participar` and `coletiva_fechar` definitions together with the storefront copy. The latest migration conflict means existing pure tests prove mirrors, not necessarily the installed lifecycle.
- Before changing checkout attribution, verify the actual PostgREST RPC signature and test absent, valid, invalid, and product/store refs. Also test the 100% platform-plus-affiliate guard.
- For future sales, test the B2B profile/terms gate, reservation-stock decrement and restoration, ledger movement isolation, timezone boundary, duplicate notice key, and partial WhatsApp failure.
- For payouts, test delivery gating, seller/affiliate ledger visibility, missing or newly changed PIX keys, and concurrent payout claims.

Useful focused suites include:

```bash
npx vitest run src/lib/coletiva.test.ts src/lib/coletiva-max-participantes.test.ts src/lib/afiliado-lote.test.ts
```
