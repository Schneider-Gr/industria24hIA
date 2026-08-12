# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

This Next.js version (16.2.10, Turbopack) has breaking changes vs. training data — check `node_modules/next/dist/docs/` before relying on prior Next.js knowledge, and note the codebase already migrated from `middleware` to `proxy` conventions where relevant.

**Repo-wide rules live one level up in `../CLAUDE.md`** (the `Industria24/` root) — read it first. It covers: no mocked data, no invented schema, secret handling, migration numbering/collision checks, and the required checklist before opening a PR. This file only adds what's specific to working inside `web/`.

## Skills de projeto

45+ skills vivem em `.claude/skills/` (espelhadas na raiz, em
`../.claude/skills/`) e carregam automaticamente por contexto — confira a
skill do domínio antes de assumir uma regra de negócio ou schema.

## Todo código passa por OpenSpec primeiro

`openspec/` (raiz em `web/openspec/`, schema `spec-driven`) é obrigatório para qualquer feature ou bugfix não-trivial — não pule direto para o código.

1. `openspec-propose` — cria o change (`proposal.md` + `specs/<capability>/spec.md` delta + `design.md` + `tasks.md`). Só planeja, não edita código.
2. Usuário revisa/aprova os artefatos.
3. `openspec-apply-change` — implementa marcando as tasks conforme fecha.
4. `openspec-archive-change` — arquiva em `openspec/changes/archive/` e sincroniza os specs deltas para `openspec/specs/`.

Antes de abrir um change novo, rode `openspec list` — pode já existir um change aberto cobrindo o mesmo escopo (ex.: `seller-posvenda` já tem os 4 artefatos prontos).

Exceção (pode pular direto para o código): typo, ajuste de copy/CSS isolado, correção de lint/type-check, ou qualquer coisa que já tenha task aberta em um change existente. Na dúvida, trate como não-trivial e proponha o change.

## Commands

```bash
npm install
cp .env.example .env.local      # Supabase URL + anon key; without it /acessos shows an honest ErrorState
npm run dev                     # next dev
npm run build                   # next build (Turbopack)
npm run lint                    # eslint (flat config, eslint.config.ts)
npx tsc --noEmit                # type-check only, no test script wraps this — run directly
```

**Tests are plain Node scripts, not a test framework.** Files named `*.test.ts` (e.g. `src/middleware.test.ts`, `src/lib/preco-faixa.test.ts`, `src/lib/coletiva.test.ts`, `src/lib/geo.test.ts`, `src/app/(admin)/admin/edicao-admin.test.ts`, `src/app/(parceiro)/parceiro/aceite-termos.test.ts`) use `node:assert/strict` and are run directly:

```bash
node --experimental-strip-types src/lib/preco-faixa.test.ts
```

Each test file's header comment says why it exists and what production behavior it pins down (often referencing the specific migration or spec number it guards) — read that comment before changing the code it covers. New non-trivial logic (a branch, a loop, a money calculation) should leave one of these behind rather than going untested.

Supabase-side logic (RLS, RPCs, triggers) is tested the same way but in SQL, under `supabase/tests/*.sql` and `supabase/qa/*.sql` — transactional scripts (`begin; … select <assertions>; rollback;`) run via `supabase db query --linked --file <path>`, never applied for real.

## Architecture

**App Router with profile-scoped route groups.** `src/app/(admin)/`, `src/app/(seller)/`, `src/app/(afiliado)/`, `src/app/(parceiro)/` are separate audiences (marketplace admin, store seller, logistics/sales affiliate, logistics partner) sharing one Next.js app and one Supabase project — cross-group changes are rare and usually a sign the change belongs in shared `src/lib/` instead. Public storefront routes (`produto/`, `loja/`, `carrinho/`, `checkout/`, `pedido/`, `coletiva/`, `leilao/`, `corridas/`, `vitrine-cep-actions.ts`) sit at the app root alongside `api/` route handlers.

**`src/lib/` is the shared domain layer** — read it before adding logic to a page/component:
- `supabase/{client,server,service}.ts` — three separate Supabase clients (browser, server/SSR with user session, service-role for privileged server actions); `database.types.ts` is generated, don't hand-edit it.
- `auth.ts` / `auth-actions.ts` — session + role helpers (`getMinhaLoja()` and similar) used across the seller/admin/afiliado route groups.
- `preco-faixa.ts` — progressive quantity-discount pricing rule (picks the highest `min_qtd` faixa ≤ quantity, ignoring expired ones); mirrored by the SQL side in checkout RPCs, so schema changes to `promocoes_progressivas`/faixas need updates on both sides.
- `coletiva.ts` + `agentes/coletiva-etapas.ts`, `agentes/coletiva-precos.ts` — compras coletivas (group-buy) staged pricing/lifecycle logic.
- `asaas.ts` — payment gateway integration (PIX transfers, charges); anything here touches real money — see the root `CLAUDE.md` rule against mocking external API responses.
- `ai/` — LLM-backed features (`openai.ts`, `atendimento.ts` chat bot, `systemPrompt.ts`, `jira.ts`); server actions calling Anthropic directly (not through this dir) also exist per-feature, e.g. `(seller)/seller/promocoes/ia-actions.ts` — check the model's **structured-output schema constraints** carefully (e.g. Anthropic's JSON schema only allows `minItems` of 0 or 1; validate array-length constraints in code instead of in the schema).
- `email.ts`, `whatsapp.ts`, `cep.ts`, `geo.ts`, `rate-limit.ts`, `bbcode.ts`, `safe-next.ts` — single-purpose integrations/utilities, no abstraction layer over them.

**`middleware.ts` stays minimal on purpose** — it currently only handles the `/cadastro` → `/seller/cadastro` redirect (regression-tested by `middleware.test.ts`, which also asserts every marketing CTA destination actually has a page). Don't grow it into a routing/auth layer; that logic lives in the route groups' own layouts/guards.

**`supabase/migrations/`** — 85+ migrations with a manually-assigned 4-digit numeric prefix (no `supabase migration new`). This is the single most common source of merge pain in this repo: multiple worktrees/branches assign the same number independently, and CI's `migrations-lint` job fails hard on any collision — see the root `CLAUDE.md`'s "Comandos" section for the exact commands to check before creating and before pushing. A branch whose migration number was claimed by another PR in the meantime cannot be salvaged by rebasing the number alone; treat it as needing re-creation against current `master`.

**`mcp-server/`** is a separate Node subpackage (own `package.json`/`tsconfig.json`/`node_modules`) exposing a public API for third-party integrations — it's excluded from the root `eslint.config.ts` and `tsconfig.json` on purpose; don't pull it into the main app's lint/build pipeline.

### CI e Branches de Longa Duração

O CI roda três jobs independentes: secret-scan com gitleaks, lint-build, e migrations-lint de colisão numérica. Todos três precisam estar verdes. Branches com longa duração sofrem drift rápido em um repo com muitas worktrees paralelas e PRs que podem ficar abertas semanas. Antes de assumir que um PR antigo só precisa de um merge-forward, é crítico verificar quantos commits atrás do master ele está — branches dezenas ou centenas de commits atrás tipicamente hit conflitos reais (não só ruído) em arquivos compartilhados e colisões de migration. Resolver tudo às cegas arrisca reverter silenciosamente features já em produção; quando em dúvida, re-derivar o diff contra o master atual é mais seguro.

**Não criar worktree nova por tarefa/sessão.** Cada worktree em `.claude/worktrees/agent-*` carrega sua própria cópia de `node_modules` (dezenas de milhares de arquivos) — o registro chegou a acumular 78 worktrees, a maioria já inválida (diretório apagado sem passar por `git worktree remove`, o que deixa `git worktree list` marcando `prunable` só depois). Trabalhe direto em `web/` a menos que o usuário peça isolamento explícito para rodar em paralelo com outra sessão. Se criar uma worktree for mesmo necessário, remova com `git worktree remove` (não apague a pasta manualmente) assim que a tarefa terminar.
