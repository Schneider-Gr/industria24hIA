## 1. Scan de dependências no CI
- [x] 1.1 Adicionar `.github/dependabot.yml` (ecosystem `npm`, diretório `/`, schedule semanal)
- [x] 1.2 Adicionar passo `npm audit --audit-level=high` no job `lint-build` do `ci.yml`

## 2. Autenticação na rota de observabilidade de cron
- [x] 2.1 `src/app/api/observabilidade/cron/route.ts` exige `Authorization: Bearer <token>`, mesmo
      padrão de `carrinho/abandono/tick` e `coletivas/tick` — reaproveita `CRON_SECRET`. Consumidor
      real localizado (`dashboard-ops/app/api/cron/route.ts`, proxy server-to-server no mesmo repo)
      e atualizado para enviar o header.

## 3. Content-Security-Policy
- [x] 3.1 Inventário real de origens levantado por grep (Supabase, Sentry; fontes são
      self-hosted via `next/font/google`; nenhum script/iframe de terceiro no client)
- [x] 3.2 Header `Content-Security-Policy` adicionado em `next.config.ts` com `script-src`/`style-src`
      `'unsafe-inline'` (sem infra de nonce por request ainda — documentado como pendência)

## 4. Comparação constant-time no webhook Asaas
- [x] 4.1 `src/app/api/asaas/webhook/route.ts` troca `!==` por `tokenValido` (helper novo
      `src/lib/token-timing-safe.ts`, mesmo padrão de `uber-direct`/`bubblewhats`)
- [x] 4.2 `.test.ts` cobrindo token correto/incorreto/tamanho diferente/nulo/vazio

## 5. Rate limit no catálogo público
- [x] 5.1 `src/app/api/categorias/route.ts` chama `checarLimite` por IP (60/min)
- [x] 5.2 `src/app/api/busca-preview/route.ts` chama `checarLimite` por IP (60/min)

## 6. Fechamento
- [x] 6.1 `npm run lint` + `npm run test` passando
- [ ] 6.2 Abrir PR referenciando a Issue #389

## Nota de sequenciamento
O passo 1.2 (`npm audit --audit-level=high` no CI) só fica verde depois que o PR de upgrade do
Next.js (`fix/upgrade-nextjs-cve-high`, #391) mergear em master — hoje o audit encontra as 5 CVEs
High do achado #1 (fora do escopo deste change). Mergear #391 antes deste PR, ou rebasear este
branch em cima dele.
