## Why

Um relatório de auditoria OWASP Top 10 externo, rodado contra o commit `3ae0771`, listou 9
achados. Os #1 e #2 (Next.js desatualizado com CVEs, webhook Uber Direct fail-open) são tratados
por outra sessão em paralelo (branch `fix/upgrade-nextjs-cve-high`) e ficam fora deste change. Os
#3 a #9 foram verificados por leitura do código real do repositório antes de virar spec — o
relatório colado é hipótese, não fato (regra já registrada no CLAUDE.md do projeto), e dois dos
sete achados não procederam nessa verificação:

- **#6 (rate limit em memória, não compartilhado entre instâncias serverless)**: já documentado
  no próprio código (`src/lib/rate-limit.ts:1-6`, comentário `ponytail:`) como limitação conhecida,
  com teto explícito e plano de upgrade para `@upstash/ratelimit` quando houver abuso real medido
  via Sentry. Não é um achado novo — é uma decisão já tomada e registrada, sem correção pendente
  a especificar aqui.
- **#8 (secret do webhook BubbleWhats via query string, não header)**: confirmado no código
  (`src/app/api/webhooks/bubblewhats/route.ts:10-19`), mas é limitação da API externa do
  BubbleWhats (não expõe alternativa de header/HMAC) — não corrigível do lado deste projeto. A
  comparação do secret já usa `crypto.timingSafeEqual`, então a mitigação possível já está
  aplicada.

Os cinco achados restantes foram confirmados por leitura de código e entram no escopo:

1. **CI sem scan de dependências vulneráveis.** `.github/workflows/ci.yml` roda `lint-build`,
   `test`, `secret-scan` (gitleaks) e `migrations-lint`, mas nenhum job roda `npm audit` nem existe
   `.github/dependabot.yml` no repositório — uma dependência com CVE nova (como o próprio Next.js
   do achado #1, hoje tratado manualmente) não é pega automaticamente em nenhum PR futuro.
2. **Rota de observabilidade de cron sem autenticação.** `src/app/api/observabilidade/cron/route.ts`
   expõe `GET` sem nenhuma checagem de autorização, enquanto as outras rotas de cron do projeto
   (`src/app/api/carrinho/abandono/tick/route.ts:114`, `src/app/api/coletivas/tick/route.ts:18`)
   exigem `Authorization: Bearer <token>`. O comentário no arquivo justifica isso como "mesmo
   padrão do restante do painel" e "só expõe metadados", mas o padrão real do projeto para rotas
   de cron é autenticar — esta é a exceção, não a regra.
3. **Sem Content-Security-Policy.** `next.config.ts` já tem HSTS, X-Content-Type-Options,
   X-Frame-Options, Referrer-Policy e Permissions-Policy (`securityHeaders`, linhas 7-13), mas CSP
   foi deliberadamente deixado de fora (comentário `ponytail:` na linha 19-20: "precisa de
   nonce/inventário de origens do app"). O inventário nunca foi feito.
4. **Comparação de token não constant-time no webhook Asaas.** `src/app/api/asaas/webhook/route.ts:288`
   compara `request.headers.get("asaas-access-token") !== WEBHOOK_TOKEN` com operador estrito,
   enquanto os outros dois webhooks do projeto (`src/app/api/webhooks/uber-direct/route.ts:57` e
   `src/app/api/webhooks/bubblewhats/route.ts:19`) usam `crypto.timingSafeEqual`. Um atacante que
   meça a latência da resposta pode, em teoria, inferir o token caractere a caractere.
5. **Catálogo público sem rate limit dedicado.** `src/app/api/categorias/route.ts` e
   `src/app/api/busca-preview/route.ts` não chamam `checarLimite` (`src/lib/rate-limit.ts`), ao
   contrário de `src/app/api/checkout/cotar-frete/route.ts`, que já usa o helper. Ambas as rotas
   fazem query direta ao Supabase sem cache write-through nem limite de chamadas, o que permite
   scraping/abuso de custo de banco sem fricção.

## What Changes

- `.github/workflows/ci.yml` ganha um job (ou passo no job existente) rodando `npm audit
  --audit-level=high` como gate informativo/bloqueante a definir no tasks.md, e um
  `.github/dependabot.yml` para PRs automáticos de dependência vulnerável (npm, semanal).
- `src/app/api/observabilidade/cron/route.ts` passa a exigir o mesmo `Authorization: Bearer
  <token>` já usado em `carrinho/abandono/tick` e `coletivas/tick` (reaproveitar padrão/env
  existente, não criar token novo).
- `next.config.ts` ganha um header `Content-Security-Policy` em `securityHeaders`, com inventário
  real das origens de script/estilo/imagem/conexão usadas pelo app (Supabase, Sentry, fontes,
  etc.) antes de definir as diretivas.
- `src/app/api/asaas/webhook/route.ts` troca a comparação `!==` do token por
  `crypto.timingSafeEqual`, no mesmo padrão já usado em `uber-direct`/`bubblewhats`.
- `src/app/api/categorias/route.ts` e `src/app/api/busca-preview/route.ts` passam a chamar
  `checarLimite` (`src/lib/rate-limit.ts`) por IP, com limites a definir no tasks.md.

## Capabilities

### New Capabilities
- `ci-dependency-scanning`: como o CI detecta dependências com vulnerabilidade conhecida.
- `observabilidade-cron-auth`: quem pode ler o histórico de execução de crons.
- `csp-headers`: quais origens o navegador pode carregar/executar no app.
- `webhook-timing-safe-compare`: como o webhook Asaas valida seu token de autenticação.
- `catalogo-rate-limit`: limite de chamadas às rotas públicas de catálogo.

## Impact

- `.github/workflows/ci.yml`, `.github/dependabot.yml` (novo).
- `src/app/api/observabilidade/cron/route.ts`.
- `next.config.ts`.
- `src/app/api/asaas/webhook/route.ts`.
- `src/app/api/categorias/route.ts`, `src/app/api/busca-preview/route.ts`.
- Achados #1 e #2 do relatório original (Next.js/CVEs, webhook Uber Direct fail-open) ficam fora
  — tratados em `fix/upgrade-nextjs-cve-high` por outra sessão.
- Achados #6 e #8 do relatório original não geram tarefa — já mitigados/documentados como
  limitação conhecida sem correção possível do lado deste projeto (ver Why).
