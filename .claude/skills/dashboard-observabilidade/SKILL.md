---
name: dashboard-observabilidade
description: Conhecimento operacional do painel de observabilidade do Industria24h — app dashboard-ops (Next.js na Vercel), integração com GitHub API, Vercel API, Sentry (org schneider-g5) e Grafana Cloud + Prometheus hospedado. Use SEMPRE que o usuário mencionar o "dashboard", "painel de operação", métricas/latência/rate-limit do projeto, Grafana, Prometheus, ou pedir para adicionar uma fonte de dados nova ao painel — mesmo que não cite o nome "dashboard-ops" explicitamente. Também use ao diagnosticar por que uma env var da Vercel "não chegou" no código, ou por que um valor "Sensitive" volta vazio.
---

# Dashboard de Observabilidade — Industria24h

Painel interno em produção que **não é** o site industria24.com.br — é um app
Next.js separado, deploy próprio na Vercel, que existe só pra dar visibilidade
operacional (issues, PRs, rate limit, latência de build, erros). Antes de
recriar qualquer parte disso do zero, leia esta skill — ela documenta as
armadilhas reais que já custaram várias rodadas de debug nesta sessão.

## Onde as coisas vivem

- **Código**: `Industria24/web/dashboard-ops/` — Next.js App Router, TypeScript.
  Repositório próprio dentro do monorepo, mas **projeto Vercel separado**.
- **Deploy**: projeto Vercel `industria24h-ops-dashboard` (scope
  `revs-projects-d261c528`), **não** o projeto `industria24h` (esse é o site
  principal em produção). URL: `https://industria24h-ops-dashboard.vercel.app`.
- **Grafana Cloud**: stack `https://humblerhubarb291.grafana.net`. Free tier —
  já inclui Prometheus hospedado, não precisa (e não dá, sem Docker nesta
  máquina) rodar Grafana/Prometheus localmente.
- **Sentry**: projeto já existia antes do dashboard, instrumentado no site
  principal — org `schneider-g5`, projeto `industria24h-web`. O dashboard só
  **consome** a API do Sentry, não reinstala nada (ver skill/memória de
  Sentry do projeto principal).

## A armadilha nº 1: dois projetos Vercel parecidos

`industria24h` (site) e `industria24h-ops-dashboard` (painel) têm armazenamento
de env vars **totalmente separado** — uma variável adicionada num não existe
no outro, mesmo que o nome seja idêntico. Isso já aconteceu 2x nesta sessão
(token do Sentry e depois o do Grafana Prometheus foram parar no projeto
errado). Antes de assumir que uma env var "não está funcionando", rode:

```bash
cd Industria24/web/dashboard-ops
vercel env ls --scope revs-projects-d261c528   # confere no projeto do painel
cd ../                                          # sobe pro site principal
vercel env ls --scope revs-projects-d261c528   # confere se foi parar aqui por engano
```

Se a variável aparecer no projeto errado, **não dá pra copiar o valor
automaticamente** — ver armadilha nº 2. Peça o valor de novo pro usuário e
adicione direto no projeto certo com `vercel env add NOME production --scope
revs-projects-d261c528` (rodar de dentro de `dashboard-ops/`).

## A armadilha nº 2: env vars "Sensitive" vêm vazias no `env pull`

Qualquer variável marcada "Sensitive" na Vercel volta como `""` em
`vercel env pull`, **mesmo pra quem tem acesso ao projeto** — não é bug de
sincronização, é a permissão de decrypt do token de CLI que está sendo usado
(mesmo padrão documentado em `industria24h-vercel-env-sensitive-supabase-nao-legivel`
na memória). Não adianta re-adicionar, renomear ou tentar de novo.

**Consequência prática:** se o valor real de um segredo é necessário (pra
testar localmente, ou pra copiar de um projeto Vercel pra outro), só tem dois
caminhos — pedir o valor em texto pro usuário, ou rodar código que lê
`process.env.X` **em produção** (a função serverless na Vercel recebe o valor
real em runtime, só o `pull`/`env ls` via CLI que fica cego). Um padrão que
funcionou bem aqui: escrever uma rota de API temporária que faz a chamada
externa usando a env var, chamar essa rota uma vez via `curl` depois do
deploy, e **apagar a rota** em seguida (ver `check-prom`/`setup-grafana` no
histórico de commits — não ficam no código final).

## Arquitetura do dashboard

Três rotas de API fazem fetch ao vivo (sem banco, sem cache além do
`revalidate` do Next) e retornam JSON limpo:

- `app/api/github/route.ts` — GitHub REST (`api.github.com`), repo
  `Schneider-Gr/industria24hIA`. Issues abertas, PRs + status de review
  (`/pulls/{n}/reviews`), rate limit (`/rate_limit`). Env: `GITHUB_TOKEN`.
- `app/api/vercel/route.ts` — Vercel REST API v6, deployments do projeto
  **principal** (`TARGET_VERCEL_PROJECT_ID`/`TARGET_VERCEL_TEAM_ID`/
  `TARGET_VERCEL_TOKEN` — nomes com prefixo `TARGET_` de propósito, pra não
  confundir com as env vars automáticas que a própria Vercel injeta no projeto
  do dashboard). Latência reportada é **build duration**, não latência de
  request em runtime — Web Analytics/Speed Insights por-request exigiria plano
  pago não confirmado.
- `app/api/sentry/route.ts` — Sentry API (`sentry.io/api/0`), org/projeto via
  `SENTRY_ORG`/`SENTRY_PROJECT`, token em `SENTRY_AUTH_TOKEN` **ou**
  `API_KEY_SENTRY2` (fallback — o usuário nomeia as env vars à sua maneira
  nesse projeto, o código aceita os dois nomes em vez de forçar re-trabalho).
  Issues não resolvidas + p50/p95 de `transaction.duration` via
  `events-stats` (degrada silenciosamente se Performance/Tracing não estiver
  habilitado no plano Sentry).

`app/page.tsx` é client component com polling de 30s nas 3 rotas, renderiza
cards. **Sem autenticação** — login por senha foi removido a pedido do
usuário; o painel expõe issues/PRs/erros pra quem tiver o link.

## Grafana Cloud: datasources + dashboard via API

Datasources criados como tipo `yesoreyeram-infinity-datasource` (plugin
Infinity, universal JSON/CSV — pré-instalado no free tier), apontando direto
pros 3 endpoints JSON acima (`https://industria24h-ops-dashboard.vercel.app/api/*`).
Vantagem: zero credencial nova pro Grafana consumir (os endpoints já são
públicos), reaproveita 100% do trabalho de parsing já feito no dashboard.

Provisionamento é via API do Grafana (`POST /api/datasources`,
`POST /api/dashboards/db`), autenticado com um service account token
(`API_KEY_GRAFANA`, role Admin, criado em Administration → Service accounts).
Dashboard UID fixo `industria24h-ops` (`overwrite: true` no payload — reroda
sem duplicar).

## Prometheus: métricas de tendência de verdade

Os JSONs acima são **snapshot**, não série temporal — pra gráfico de
tendência de verdade, uma rota (`app/api/push-metrics/route.ts`) lê os 3
endpoints e empurra os números pro Prometheus hospedado do Grafana Cloud via
`remote_write`, usando o pacote npm `prometheus-remote-write` (faz o
protobuf+snappy). Credenciais: `GRAFANA_PROM_URL` (endpoint
`.../api/prom/push`), `GRAFANA_PROM_USERNAME` (Instance ID numérico) e o
token (nome real na Vercel: `GRAFANA_PRHOMOTEUS_API_KEY` — sic, com o typo
que o usuário digitou; o código lê esse nome literal, não corrija a variável
sem também corrigir o código). Chamado por `vercel.json` → `crons` (Hobby
plan = **máximo 1x/dia**, não dá pra ir mais frequente sem upgrade).

Duas pegadinhas específicas dessa lib, já resolvidas — não redescobrir:

1. **Turbopack falha o build** com `Module not found: node-fetch`, mesmo o
   `fetch` sendo passado explícito em `options.fetch`. A lib faz
   `require("node-fetch")` no topo da função (linha morta em runtime quando
   você passa `fetch` próprio, mas o bundler resolve estaticamente mesmo
   assim). Fix: `npm install node-fetch` só pra satisfazer o resolver, não
   precisa configurar nada com ele.
2. **`pushMetrics()`/`pushTimeseries()` nunca lançam exceção em falha HTTP** —
   retornam `{status, statusText, errorMessage}` mesmo em 401/500. Se o código
   só faz `await pushMetrics(...)` sem checar `result.status`, uma falha de
   autenticação passa despercebida e a rota reporta sucesso falso. Sempre
   checar `result.status !== 200 && result.status !== 204` e retornar erro.

## Diagnóstico rápido quando algo no painel "não funciona"

1. É rota que já existe? Testa direto: `curl -s
   https://industria24h-ops-dashboard.vercel.app/api/<nome> | head -c 500`.
2. Erro de auth (401/"invalid token"/"no credentials")? Primeiro suspeito:
   env var no projeto errado (armadilha nº 1) ou nome errado (o código
   assume nomes específicos — conferir contra esta skill antes de assumir que
   o valor está errado).
3. Precisa confirmar que um valor chegou em runtime sem poder decriptar via
   CLI? Escreve uma rota de diagnóstico temporária, testa, apaga (armadilha
   nº 2).
4. Mudou algo em `dashboard-ops/`? Sempre `npm run build` local antes de
   `vercel --prod --scope revs-projects-d261c528 --yes` — Turbopack pega erro
   de tipo/import que só aparece no build de produção, não no dev.
