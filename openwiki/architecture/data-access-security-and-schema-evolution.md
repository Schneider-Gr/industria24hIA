---
type: security architecture
title: Data Access, Security, and Schema Evolution
description: Supabase trust boundaries, database-enforced authorization, route and browser defenses, and the migration discipline that preserves security and schema correctness.
tags: [supabase, authorization, row-level-security, storage, migrations, schema-evolution]
verified:
  - by: openwiki/0.4.3
    at: 2026-09-23T13:24:35.866Z
sources:
  - id: openwiki-source-c4cf3c765e6f4c8f07218aaa
    resource: repo://.claude/skills/migrations-industria24/SKILL.md
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-a2371d6362e5db4bc834ad03
    resource: repo://CLAUDE.md
  - id: openwiki-source-98da77ced0fda4fd463b30d2
    resource: repo://scripts/proximo-migration.sh
  - id: openwiki-source-74a16a240a530c02d445c830
    resource: repo://src/app/(admin)/admin/layout.tsx
  - id: openwiki-source-ceecbd12adbb682103c59ad3
    resource: repo://src/app/(afiliado)/afiliado/layout.tsx
  - id: openwiki-source-53f8798a974bf51227bf5e14
    resource: repo://src/app/(parceiro)/parceiro/layout.tsx
  - id: openwiki-source-e7b4359c9ac840bcd2224c29
    resource: repo://src/app/(seller)/seller/layout.tsx
  - id: openwiki-source-9b5212d30cf3db12db954fa8
    resource: repo://src/app/api/asaas/webhook/route.ts
  - id: openwiki-source-2cbc059c30443b1e7749fbce
    resource: repo://src/lib/asaas-confirmar.ts
  - id: openwiki-source-22f1a51f3dd967c105fa32fa
    resource: repo://src/lib/auth.ts
  - id: openwiki-source-538e4a2bd1293d9deb8faebe
    resource: repo://src/lib/gate-rotas.ts
  - id: openwiki-source-912a05cb2ad8b6d48298f0c4
    resource: repo://src/lib/supabase/client.ts
  - id: openwiki-source-f802f56f3907ab650d20eeaa
    resource: repo://src/lib/supabase/public.ts
  - id: openwiki-source-b22459c0abfe5c0d18ee9ed7
    resource: repo://src/lib/supabase/server.ts
  - id: openwiki-source-84fe5c4ea822f9abed688266
    resource: repo://src/lib/supabase/service.ts
  - id: openwiki-source-7c05722a4c860de6df829ceb
    resource: repo://src/lib/token-timing-safe.ts
  - id: openwiki-source-f34ac1e549d94dc3ac475ae4
    resource: repo://src/proxy.ts
  - id: openwiki-source-f3cb57442de758cb6483c1e3
    resource: repo://supabase/migrations/0002_seller_module.sql
  - id: openwiki-source-47d0fa92c26797023983a246
    resource: repo://supabase/migrations/0004_admin_rls.sql
  - id: openwiki-source-63c3bee433b348f0521994dd
    resource: repo://supabase/migrations/0012_hardening_seguranca.sql
  - id: openwiki-source-783a3ab8c2614c3a729001ce
    resource: repo://supabase/migrations/0035_chave_pix_protegida.sql
  - id: openwiki-source-141360b36c31c949fee48f76
    resource: repo://supabase/migrations/0038_fix_checkout_guard_linha_itens.sql
  - id: openwiki-source-848be8a1405293c24885c8aa
    resource: repo://supabase/migrations/0051_storage_produtos_lojas.sql
  - id: openwiki-source-9c241aa65d72a1a43bd0709b
    resource: repo://supabase/migrations/0104_pos_venda_disputas.sql
  - id: openwiki-source-4c9d092064451b5e00f38154
    resource: repo://supabase/migrations/0109_fix_guard_campos_restritos_regressao.sql
  - id: openwiki-source-bd35bfc4aed2da8dec909ce0
    resource: repo://supabase/migrations/0124_security_barrier_views_definer.sql
  - id: openwiki-source-7c440fdfd8aa5b18afd089ea
    resource: repo://supabase/migrations/0126_security_barrier_views_definer_2.sql
  - id: openwiki-source-4bc15259cc8e601603c61e8e
    resource: repo://supabase/migrations/0130_security_barrier_views_definer_3.sql
  - id: openwiki-source-de5b2497fc3d4e4582c89e7a
    resource: repo://supabase/migrations/0142_fix_confirmar_chave_pix_auth.sql
  - id: openwiki-source-19378a45978732d2e7daf8a6
    resource: repo://supabase/migrations/0143_storage_buckets_limite_imagem.sql
  - id: openwiki-source-839f0585311c3b956ae75240
    resource: repo://supabase/migrations/0149_cifrar_cpf_cnpj_asaas_clientes.sql
  - id: openwiki-source-787343dd91ea65e09591f6e1
    resource: repo://supabase/migrations/0153_auditoria_acesso_negado.sql
  - id: openwiki-source-df713c62615067325c082e6b
    resource: repo://supabase/migrations/0175_estoque_ledger_milestone1.sql
  - id: openwiki-source-5c39320caf7b216ebec11227
    resource: repo://supabase/migrations/0191_guarda_estoque_e_repasse_em_pedido_entregue.sql
  - id: openwiki-source-76df1aa8f810da20dae7bbd3
    resource: repo://supabase/tests/0191_guarda_pedido_entregue.sql
  - id: openwiki-source-7b20bb5e8ae8bd867c8829f9
    resource: repo://supabase/tests/rls_smoke.sql
generated: { by: "openwiki/0.4.3", at: "2026-09-23T13:24:35.866Z" }
---

# Data Access, Security, and Schema Evolution

Supabase is the persistence layer and the authorization authority. UI and layout gates make protected areas usable and reduce accidental exposure, but they do not authorize a database operation. Database RLS, explicit tenant predicates, triggers, and narrowly scoped RPCs decide whether a row or protected field may change.

## Select a client for the trust boundary

All client factories use the generated `Database` type. It gives TypeScript query checking against a captured schema; it does not create database objects or grant access.

| Entry point | Credential and context | Appropriate use |
| --- | --- | --- |
| `src/lib/supabase/client.ts` → `createClient()` | Browser client with the anon key. A user session, when present, is evaluated by RLS. | Normal Client Component reads and writes. |
| `src/lib/supabase/server.ts` → `createClient()` | Anon-key server client wired to Next request cookies. Session context and RLS still apply. | Default Server Component, Server Action, and Route Handler access. |
| `src/lib/supabase/public.ts` → `createPublicClient()` | Anon key without cookies, persisted session, or token refresh. RLS still applies. | Public catalogue reads that must remain compatible with ISR. |
| `src/lib/supabase/service.ts` → `createServiceClient()` | Server-only service-role key; no persisted or refreshed session. It bypasses RLS and fails if unconfigured. | A reviewed provider webhook or system job after its caller boundary has authenticated and validated input. |

```mermaid
flowchart TD
  Request["Browser or server request"] --> Anon["Anon client and user session"]
  Anon --> Database["RLS, predicates, triggers, and RPCs"]
  Database --> Data["Tables and Storage objects"]
  Provider["Authenticated provider webhook"] --> Validate["Token and payload validation"]
  Validate --> Service["Server-only service client"]
  Service --> Data
```

This separates normal session access from the service-role path, which must be preceded by a dedicated authentication and validation boundary.

Do not use service role as an application authorization shortcut, expose `SUPABASE_SERVICE_ROLE_KEY`, or import its factory into browser-delivered code. Environment values are trimmed to avoid BOM/whitespace failures, but configuration is deliberately non-throwing at import time so the UI can show an honest unconfigured state. The Asaas webhook is an example of the required privileged boundary: it compares the access token in constant time, rejects an absent service configuration, accepts only recognized event shapes, and delegates payment meaning to shared logic. That service function checks the order exists, makes repeated notifications idempotent using `dt_pagamento`, matches the charge id and received amount, and conditionally updates the still-unpaid order before marking its lines paid. Notification and dispatch side effects are best-effort after the payment write.

## Session, route, and browser protections

`getUser()` treats an exception from `auth.getUser()` as logged out after sending it to Sentry. Application helpers resolve panel destination and roles, but they are not authorization authority. Keep explicit predicates even where RLS exists: `getMinhaLoja()` filters `lojas` by `owner_id = user.id` because public visibility of active stores means an unqualified `.limit(1)` can select another seller’s store. Similar helper predicates prevent an admin’s broader RLS visibility from being mistaken for the caller’s own affiliate or logistics membership.

The proxy refreshes Supabase session cookies, redirects unauthenticated requests for `/admin`, `/seller`, `/afiliado`, and `/parceiro` to login, and applies CSP. It intentionally does not query roles; route-group layouts independently check the fine-grained admin, store-owner, affiliate, or logistics-partner condition, accommodate the documented onboarding exceptions, audit a role denial, and redirect. This is defense in depth: direct API/database requests remain governed by database controls.

Protected panel routes receive a per-request nonce CSP with `'strict-dynamic'` and no `'unsafe-inline'` in `script-src`; public and onboarding routes retain the compatible policy needed for static/ISR rendering. Common directives restrict connections, frames, objects, base URL, form actions, and allowed image origins. CSP limits browser injection/exfiltration risk, but it is not a substitute for server-side authorization.

`registrar_acesso_negado()` is a narrowly granted `SECURITY DEFINER` audit RPC: it does nothing for no session and otherwise records route and expected role in `auditoria_eventos`. It supports observability of layout denials without granting clients a direct audit-table insert policy.

## Database authorization and integrity

### RLS scopes rows; guards scope fields

New tables start deny-by-default: enable RLS and add no policy until the business rule is established. Core seller access is rooted in `auth.uid()`: store ownership flows into products, centres, affiliations, orders, and line items. `is_admin()` is a `SECURITY DEFINER` membership helper backed by `admins`, avoiding policy recursion; ordinary users can read only their own membership row.

RLS authorizes rows, not individual columns. `guard_campos_restritos()` closes that gap. Regular users cannot self-approve products, alter store moderation state, set protected financial order/line fields, change a PIX key directly, or finalize a dispute. The current guard validates sensitive values at insert as well as update, rejects non-admin deletion of paid orders/items, and returns `OLD` on delete. Service/postgres calls and administrators pass the guard, which is why a service call needs its own trusted caller boundary.

Some legitimate writes require a bounded database capability rather than a broad exception:

- Checkout validates and calculates within its database function, sets transaction-local `app.checkout_rpc`, then inserts the calculated order and lines. The guard only recognizes that setting in the same transaction.
- `alterar_chave_pix_loja` authenticates the caller, validates format and ownership, sets local `app.chave_pix_rpc`, clears confirmation, and writes an audit event. Direct changes remain blocked; execute is granted to `authenticated`, not `public`.
- PIX confirmation functions test `auth.role() = 'service_role'` or `is_admin()` and remove anonymous execution. A null `auth.uid()` does **not** demonstrate a trusted backend caller.

The database also owns business invariants beyond access. Inventory movement records are immutable, balance updates serialize on the product/centre balance row and cannot become negative, and seller adjustment occurs through an ownership-checking `SECURITY DEFINER` RPC that requires a reason. The ledger’s first milestone mirrors `produtos.estoque_atual`; it is not yet the source of checkout writes. A later delivery/cancellation guard prevents inventory restoration and payout reversal after any item has been delivered, including partial delivery, and records the skipped restoration for audit.

Sensitive payment identity is protected at rest too. The CPF/CNPJ trigger encrypts a non-empty `asaas_clientes.cpf_cnpj` with a Vault-held key then clears the plaintext column. Its key lookup and decrypt RPC are executable only by `service_role`; applying the migration fails early if the Vault secret is absent.

### Views and Storage have their own contracts

`lojas_vitrine` is an owner-running, minimal projection of active stores. Public product access requires an approved product whose store appears in that view rather than public direct reads of `lojas`. Other owner-running views provide tenant-filtered customer, affiliate, and logistics data, public partner summaries, or aggregates. They retain a narrow column allowlist and in-view tenant predicate, and use `security_barrier = true` so a consumer predicate cannot be pushed ahead of that filter. Setting `security_invoker` would reapply base-table RLS and break these deliberately scoped projections; changes to a view require review as a security change.

Storage authorization is independent of application-table RLS:

- Public `produtos` and `lojas` buckets allow reads, but upload/delete policies require an authenticated owner of the store encoded as the first segment of `<loja_id>/<arquivo>`.
- Private `disputas` storage authorizes its `<disputa_id>/...` folder to dispute participants, plus administrators for reading.
- Bucket configuration limits `produtos`, `lojas`, and `marketplace` uploads to JPEG, PNG, or WebP and 5 MiB. Client validation is only usability; the bucket setting is enforced.

## Safe schema evolution

Migrations in `supabase/migrations/` are the change record. Before changing a schema-dependent feature, inspect callers, generated types, RLS policies, triggers, RPC grants, views, Storage conventions, and focused tests. A TypeScript cast or a stale generated type never establishes that a column, function, policy, or view exists in the target database.

1. Use `scripts/proximo-migration.sh` to choose a number, and run `scripts/proximo-migration.sh --checar` immediately before push. The script considers `origin/master` and migration directories across all worktrees, covering collisions not yet committed by another session. CI separately rejects duplicate four-digit prefixes.
2. Apply through the linked database, never ad-hoc HTTP: `supabase db query --linked --file <arquivo>`. Rehearse production DDL/DML in `begin;`, run a verification query, then `rollback;` first.
3. Confirm the deployed object with `to_regclass` or `information_schema`; migration history can drift and is not proof that schema exists.
4. Regenerate `src/lib/supabase/database.types.ts` from the real linked schema and inspect its diff. Generation without a token can silently truncate the file. Local `as any` / `unknown` adapters mark known type drift, not permission to invent schema.
5. Enable RLS for every new table, start with no policy, then add minimal policies, grants, triggers/RPC authorization, and focused proof for its intended access path.

## Verification and review

Run database authorization checks against the linked target, not merely TypeScript tests:

```sh
supabase db query --linked --file supabase/tests/rls_smoke.sql
```

The RLS smoke test uses a transaction and rolls back. It verifies RLS is enabled on public tables, owner-running views retain their filter and limited projection, an arbitrary authenticated subject cannot read protected tenant rows, and the service-only cancellation RPC rejects an authenticated JWT. It skips absent objects with a notice, so rollout also needs explicit schema-presence verification. `supabase/tests/0191_guarda_pedido_entregue.sql` similarly rolls back while proving restoration occurs only when no item is delivered and that cancellation refuses a delivered order.

On pull requests to and pushes to `master`, CI independently runs Gitleaks, lint/build plus high-severity `npm audit`, Vitest, and migration-prefix collision detection. These are useful repository gates, but neither UI tests nor CI compile success proves a database policy, trigger, RPC, view, or Storage policy behaves correctly.

### Change checklist

- Is ordinary user work using an anon/session client and constrained by RLS?
- Does an ambiguous query retain its explicit ownership predicate?
- Is any service-role caller authenticated and its payload validated before privileged access?
- Are field integrity, role checks, and sensitive state transitions enforced by database guard/trigger/RPC rather than a layout or UI?
- Do views preserve their filter, barrier, grants, and narrow projection; do Storage paths still satisfy their policies?
- Were migration number, linked-schema presence, generated types, RLS default, and a focused transactional test checked?

## Related pages

- [System map](/openwiki/architecture/system-map.md)
- [Marketplace catalog and roles](/openwiki/concepts/marketplace-catalog-and-roles.md)
- [External services and webhooks](/openwiki/integrations/external-services-and-webhooks.md)
- [Checkout, payment, and order lifecycle](/openwiki/workflows/checkout-payment-and-order-lifecycle.md)
- [Inventory ledger and warehouse operations](/openwiki/workflows/inventory-ledger-and-warehouse-operations.md)
- [Verification strategy](/openwiki/testing/verification-strategy.md)
