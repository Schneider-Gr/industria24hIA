# Dashboard de Operação — Industria24h

## Objetivo

Painel interno (deploy próprio na Vercel, protegido por senha) para acompanhar
saúde do projeto `industria24hIA` num único lugar: requisições/latência em
produção, issues e PR review no GitHub, rate limit da API do GitHub, e erros
via Sentry (projeto Sentry já existe e já está instrumentado no app principal —
ver `project-industria24h-sentry` — este dashboard só consome, não reinstala nada).

## Escopo

1. **GitHub** (`api.github.com`, repo `Schneider-Gr/industria24hIA`)
   - Issues abertas (contagem + lista das mais recentes)
   - PRs abertos + status de review (approved/changes_requested/pending)
   - Rate limit do token usado (`/rate_limit`)
2. **Vercel** (projeto `industria24h`, team `revs-projects-d261c528`)
   - Últimos deployments (status, duração de build)
   - Latência de requests (Vercel Web Analytics/Speed Insights via API, se
     disponível no plano; fallback: duração de function invocations)
3. **Sentry** (org `schneider-g5`, projeto `industria24h-web`)
   - Contagem de issues não resolvidas / novas nas últimas 24h
   - p50/p95 de transações (latência de servidor) se Performance estiver habilitado

## Fora de escopo

- Não recria nem reconfigura o Sentry (alerta/dashboard nativo do Sentry já é
  outro pendente registrado em memória — não duplicar aqui).
- Não expõe tokens no client — tudo server-side (route handlers).
- Não requer novo domínio — usa `*.vercel.app` do novo projeto.

## Arquitetura

Next.js 15 (App Router) mínimo, sem banco de dados — cada visita busca ao vivo
nas 3 APIs (com `revalidate` curto para não estourar rate limit). Auth simples:
middleware com cookie de senha (`DASHBOARD_PASSWORD`), formulário de login.

- `src/app/api/github/route.ts` — GET, chama GitHub REST direto com `fetch` +
  `GITHUB_TOKEN`.
- `src/app/api/vercel/route.ts` — GET, chama Vercel REST API com `VERCEL_TOKEN`.
- `src/app/api/sentry/route.ts` — GET, chama Sentry API com `SENTRY_AUTH_TOKEN`.
- `src/app/page.tsx` — client component, `useEffect` + polling 30s nas 3 rotas,
  renderiza cards.
- `src/middleware.ts` — gate de senha.

## Verificação

- `npm run build` local sem erro.
- `npm run dev` manual: login funciona, os 3 cards carregam dado real (não mock).
- Deploy `vercel --prod`, abrir a URL final e confirmar os 3 painéis populados.
