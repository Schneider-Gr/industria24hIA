---
type: marketplace-domain-model
title: Marketplace Catalog, Roles, and Moderation
description: Explains buyer-facing catalog visibility and the seller, administrator, affiliate, and logistics-partner roles that operate it. Covers ownership, database-enforced publication gates, moderation, and advisory AI curation.
tags: [marketplace, catalog, sellers, moderation, affiliates, logistics, authorization]
sources:
  - id: openwiki-source-74a16a240a530c02d445c830
    resource: repo://src/app/(admin)/admin/layout.tsx
  - id: openwiki-source-cddb022a8ddbd2a66d1ae82a
    resource: repo://src/app/(admin)/admin/lojas/actions.ts
  - id: openwiki-source-273dc906034f8a341f1959b6
    resource: repo://src/app/(admin)/admin/parceiros/actions.ts
  - id: openwiki-source-fb4a76af417d51a73a6275a1
    resource: repo://src/app/(admin)/admin/produtos/actions.ts
  - id: openwiki-source-a5201fb4d22a31d225febbb9
    resource: repo://src/app/(afiliado)/afiliado/actions.ts
  - id: openwiki-source-4067508b01e2920b7c8b809f
    resource: repo://src/app/(parceiro)/parceiro/aceite-termos.test.ts
  - id: openwiki-source-7aa876b27c73ecb8d9ba83a5
    resource: repo://src/app/(parceiro)/parceiro/actions.ts
  - id: openwiki-source-e7b4359c9ac840bcd2224c29
    resource: repo://src/app/(seller)/seller/layout.tsx
  - id: openwiki-source-cba7fc99b669b238e73d4d27
    resource: repo://src/app/(seller)/seller/minha-loja/actions.ts
  - id: openwiki-source-bc442e5e91e9748e214325c4
    resource: repo://src/app/(seller)/seller/produtos/actions.ts
  - id: openwiki-source-e6003a1e551d9c47914274a3
    resource: repo://src/app/loja/%5Bid%5D/page.tsx
  - id: openwiki-source-7047c6edecec94399c583a71
    resource: repo://src/app/produto/%5Bid%5D/page.tsx
  - id: openwiki-source-05b36393a1169a6df07020c6
    resource: repo://src/components/admin/ModerarSituacaoLoja.tsx
  - id: openwiki-source-8b90f71d82f0b19b8bc0f4ed
    resource: repo://src/lib/afiliado-lote.test.ts
  - id: openwiki-source-5d432d4fb68d5ed1edff7408
    resource: repo://src/lib/agentes/curadoria-orquestrador.ts
  - id: openwiki-source-7e2973bc70b971b7c0e426b1
    resource: repo://src/lib/agentes/curadoria-regras.test.ts
  - id: openwiki-source-6f7781331b9cf6b543bf1896
    resource: repo://src/lib/auth-actions.ts
  - id: openwiki-source-91542766e916636c909539ce
    resource: repo://src/lib/auth-destino.test.ts
  - id: openwiki-source-1f1163dac5639d1e173e0595
    resource: repo://src/lib/auth-destino.ts
  - id: openwiki-source-22f1a51f3dd967c105fa32fa
    resource: repo://src/lib/auth.ts
  - id: openwiki-source-f3cb57442de758cb6483c1e3
    resource: repo://supabase/migrations/0002_seller_module.sql
  - id: openwiki-source-47d0fa92c26797023983a246
    resource: repo://supabase/migrations/0004_admin_rls.sql
  - id: openwiki-source-63c3bee433b348f0521994dd
    resource: repo://supabase/migrations/0012_hardening_seguranca.sql
  - id: openwiki-source-d50de77be5063237edfac154
    resource: repo://supabase/migrations/0014_checkout_asaas.sql
  - id: openwiki-source-453c5beea570c516d98d6853
    resource: repo://supabase/migrations/0021_guard_afiliacoes.sql
  - id: openwiki-source-b1e8ce722f5d11d6bb1b60bc
    resource: repo://supabase/migrations/0039_parceiro_logistico_schema.sql
  - id: openwiki-source-c99faed5ad8a30fba8387a98
    resource: repo://supabase/migrations/0040_parceiro_logistico_rpcs.sql
  - id: openwiki-source-9eee8d7f804c366aec7e691e
    resource: repo://supabase/migrations/0064_produto_curadoria.sql
  - id: openwiki-source-4c9d092064451b5e00f38154
    resource: repo://supabase/migrations/0109_fix_guard_campos_restritos_regressao.sql
  - id: openwiki-source-8d2c480e9e2e45e15b930607
    resource: repo://supabase/migrations/0121_bloqueia_auto_afiliacao.sql
  - id: openwiki-source-922972ad18e46f8438753b6d
    resource: repo://supabase/migrations/0136_produto_sugestoes_ia_parecer.sql
  - id: openwiki-source-0feb036a5210418334238d92
    resource: repo://supabase/migrations/0137_loja_avisos_curadoria.sql
  - id: openwiki-source-7cc6fd2f1b32893b792d3a31
    resource: repo://supabase/migrations/0152_loja_situacao_em_analise.sql
generated: { by: "openwiki/0.4.3", at: "2026-08-28T19:56:09.348Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-08-28T19:56:09.348Z
---

# Marketplace Catalog, Roles, and Moderation

The marketplace separates buyer-facing discovery from authenticated operating panels. A store is owned by an authenticated user, products belong to a store, and categories, images, and distribution-center links provide catalog structure. Publication is deliberately stricter than record existence: buyers can read only approved products associated with active stores.

For database-wide access patterns, see [Data Access, Security, and Schema Evolution](/openwiki/architecture/data-access-security-and-schema-evolution.md). The downstream transaction and fulfillment rules are covered by [Checkout, Payment, and Order Lifecycle](/openwiki/workflows/checkout-payment-and-order-lifecycle.md), [Collective Commerce and Affiliates](/openwiki/workflows/collective-commerce-and-affiliates.md), and [Fulfillment and Logistics](/openwiki/workflows/fulfillment-and-logistics.md).

## Actors and access boundaries

| Actor | Surface | Responsibility and boundary |
| --- | --- | --- |
| Buyer or visitor | `/loja/[id]`, `/produto/[id]` | Browses the public catalog and proceeds to checkout. These pages use public reads, not seller authority. |
| Seller | `/seller` | Maintains its own store and catalog, including product images and distribution-center links. Seller actions derive the store from the authenticated owner rather than accepting a store ID from the form. |
| Administrator | `/admin` | Has cross-seller moderation authority over stores and products. Server actions independently check `isAdmin()` before changing moderation fields. |
| Affiliate | `/afiliado` | Requests product sales affiliation after accepting terms. The product, rather than submitted form values, supplies the store and commission. |
| Logistics partner | `/parceiro` | Registers as a driver or carrier, then accepts or bids on delivery jobs and progresses only assigned jobs after approval. |

`getMinhaLoja()` explicitly includes the authenticated user's `owner_id`. This is defense in depth rather than a redundant filter: active stores are publicly readable through catalog access, so an unconstrained single-row lookup could otherwise resolve a different seller's store. The seller layout then requires a session, an owned store, and accepted seller terms; its attention badges use that store ID.

The administrator layout similarly requires a session and `isAdmin()`. It counts stores in `EmAnalise` as the store-moderation queue, alongside other operational counts. The layout is only a navigation gate: each sensitive server action repeats its role check.

### Post-login routing

An account may accumulate roles. When login has no explicit `next` destination, `resolverDestinoPorPapel()` resolves role facts on the server and uses the pure `destinoPorPapel()` precedence: administrator, seller with an owned store, affiliate with an affiliation, logistics partner with a partner record, then the buyer home page. This is routing convenience, not database authorization: the destination does not grant a role, and panel layouts and actions still enforce their own gates. The pure precedence function has focused unit coverage.

## Catalog ownership and publication

```mermaid
flowchart TD
  Seller["Authenticated seller"] --> Save["salvarLoja writes owner and EmAnalise"]
  Save --> DbGuard["Database default and insert trigger"]
  DbGuard --> Review["EmAnalise database state"]
  Review --> Queue["Admin queue count"]
  Queue --> Ui["UI label: Em análise"]
  Review --> Admin["Admin server action"]
  Admin --> Active["Ativa database state"]
  Admin --> Inactive["Inativa database state"]
  Active --> View["lojas_vitrine"]
  View --> Buyer["Public store catalog"]
  Save --> Advisory["Best effort advisory curation"]
  Advisory --> Notices["Informational store notices"]
```

This flow distinguishes the enforceable publication path from presentation and assistance: the default, insert trigger, administrator action, and active-store view are database-backed controls; the translated UI label and advisory notices do not change store state or publish a store.

The schema ties `lojas.owner_id` to an authenticated user and `produtos.loja_id` to a store. Categories and subcategories form public taxonomy; `produto_imagens` and the `produto_centros` many-to-many table are dependent catalog records. RLS scopes seller access through store ownership.

Seller product actions validate required name and numeric inputs, find the caller's owned store, and verify ownership again before update, deletion, minimum-stock changes, or image attachment. Creation links selected distribution centers and an optional image after inserting the product. Those follow-up writes are not a transaction with the product insert: a distribution-center link failure can return an error after the product exists, so repair or retry must be safe.

The public projection is intentionally narrow. `lojas_vitrine` returns only active stores and catalog-oriented columns; it excludes sensitive store fields such as PIX key, CNPJ, email, and address. Public product reads additionally require an approved product joined to that view. The store page queries the view and filters to approved products with a positive price. The product page also calls `notFound()` for a missing, non-positive-price, or non-approved product, including direct requests.

### Moderation authority and the store gate

`lojas.situacao` has the valid states `Ativa`, `Inativa`, and `EmAnalise`, and its database default is `EmAnalise`. `salvarLoja()` also explicitly inserts `situacao: "EmAnalise"` with the authenticated `owner_id`; this redundancy protects the intended lifecycle if the column default regresses. A separate `before insert` trigger rejects a non-administrator insert whose situation is not `EmAnalise`. It allows trusted contexts identified by a null `auth.uid()`, administrators, or the `app.checkout_rpc` setting. Existing stores are deliberately not rewritten by that migration.

Consequently, a newly created seller store is not public merely because it exists. Only an administrator can move it to `Ativa` (approval) or `Inativa` (refusal/deactivation), and `lojas_vitrine` admits only `Ativa`. The administrator action independently checks `isAdmin()`, validates the supplied ID and one of those three values, writes `lojas.situacao`, and revalidates the admin list. `ModerarSituacaoLoja` presents the stored `EmAnalise` value as **Em análise** and changes the button wording to **Aprovar** or **Recusar**; those labels are UI affordances, not the enforcement mechanism.

The `admins` table and security-definer `is_admin()` function are the database basis for administrator RLS policies across seller-owned marketplace tables. The existing update guard is the final boundary for direct Data API writes: a non-administrator cannot change a store situation. Product moderation independently accepts `Aprovado`, `Recusado`, `Pendente`, or `rascunho`; products begin `Pendente`, and a seller may only re-submit to `Pendente`. Administrators and trusted server contexts bypass the product/update guards. Do not model the listed values as a complete transition graph: the repository establishes allowed values and authority constraints, not every possible administrator transition.

## Buyer catalog and checkout integrity

The store page uses 60-second ISR and the product page uses 30-second ISR, so rendered price or stock can briefly lag. This is presentation freshness only: `checkout_criar_pedido` re-reads every product in the database, requires an approved positive-price product in an active store, checks quantity and stock, and rejects a cart spanning stores. It is the integrity boundary rather than the catalog card.

## Advisory AI curation

Store and product saves schedule curation with `after()`. The orchestrator uses a service client to run deterministic completeness checks and only calls the LangSmith text helper when gaps exist. It catches errors, so a curation failure cannot fail a seller save. Product runs replace an existing pending `parecer` suggestion before inserting the new one, preventing old pending opinions from accumulating; store runs replace only pending notices and preserve seller-resolved or dismissed notices.

There is an intentional asymmetry when text generation fails. A product run returns without a new suggestion if no `parecer` is available. A store run instead falls back to the deterministic gaps and still stores actionable notices. Thus AI-generated wording enriches store curation but is not required to communicate missing registration data.

AI output is advisory. A product `parecer`, including a suggested decision, is stored separately in `produto_sugestoes_ia`; an administrator must confirm it manually. The agent cannot change `status_produto` or write the append-only official `produto_curadoria` history. Sellers can read history only for their own products. Store completeness notices are informational and sellers can resolve or dismiss their own notices; neither AI path publishes a listing.

## Affiliate enrollment

An affiliate request requires the sales-affiliate terms, derives store and commission from the current product, and starts `Pendente`. Batch enrollment de-duplicates requested IDs, rechecks live eligibility, skips already affiliated products, and preserves each product's current commission.

The commission and identity protections are also database-backed: percentage is constrained to `0..100`, a pending insert must match the product commission, non-admins cannot reassign an affiliate, and a commission change requires pending status. A separate trigger prevents a store owner from affiliating with its own store or products.

## Logistics-partner workflow

New logistics partners are `Pendente` driver or carrier records and administrators moderate their status. Only approved partners can read available rides or use the acceptance and bidding RPCs. The RPCs are authoritative: acceptance locks a still-`Publicada` first-accept ride, while bidding requires a positive bid on an open auction ride.

```mermaid
stateDiagram-v2
  [*] --> Publicada
  Publicada --> Aceita: accept or selected bid
  Aceita --> Coletada: assigned partner
  Coletada --> EmTransito: assigned partner
  EmTransito --> Entregue: assigned partner and photo
```

This is the database-enforced ride progression after a partner has been assigned; only the assigned partner may take each listed transition.

For an order-backed ride, the partner action confirms the buyer delivery code before requesting `Entregue`. A bad code stops the flow. Once confirmation succeeds, seller payout is best effort: a payout error is reported but does not reverse the recorded delivery confirmation. The ride RPC still requires a delivery photo for the `Entregue` transition.

## Safe changes and focused verification

- Preserve both public gates when changing catalog reads: the active-store `lojas_vitrine` projection and approved-product predicate. Do not add confidential store fields to the view.
- Keep all three layers of the store publication gate aligned: `salvarLoja()` explicit `EmAnalise`, the column default, and `guard_loja_insert_moderacao`. A UI-only default or label is not sufficient.
- Retain explicit server-action ownership checks alongside RLS. Add a database guard, not only a UI restriction, for any new moderated field.
- Treat post-save curation as non-blocking and keep its writes separate from moderation state. Human administration remains the decision point; store notices must retain their deterministic fallback.
- `src/lib/auth-destino.test.ts` covers the role-routing precedence. The curatorial rule tests cover complete and incomplete product and store records. The affiliate batch tests cover duplicate and ineligible selection plus per-product commission. The partner terms test covers mandatory first acceptance and preservation of an earlier acceptance.
- Add Supabase integration coverage for a normal seller insert with omitted, explicit `EmAnalise`, and attempted `Ativa` situations; direct seller situation updates; administrator approval; and anonymous visibility before and after approval. These validate defaults, triggers, RLS, and the view together—behaviors a component test cannot establish. Integration tests are also appropriate for cross-owner writes, direct reads of inactive or unapproved records, and concurrent ride acceptance.
