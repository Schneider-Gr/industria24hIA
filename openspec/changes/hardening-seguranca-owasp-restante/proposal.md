## Why

O usuário trouxe uma lista de 10 achados de uma auditoria OWASP de 24/08/2026 para virar
correções. Antes de escrever qualquer tarefa, cada item foi reconferido contra o código atual e
contra o trabalho já em andamento no repositório — regra do CLAUDE.md ("brief com diagnóstico
técnico é hipótese, não fato") — porque este checkout tem tráfego concorrente muito alto (ver
`openspec/changes/hardening-seguranca-owasp-medio-baixo/`, PR #397, e memória de sessão
`industria24h-prd025-auditoria-seguranca-vibe-coding`).

**Resultado da reconferência: metade da lista já está coberta por PRs abertos ou por uma decisão
já registrada em outro change. Este spec change cobre só o que sobrou sem dono.**

- **#1 (Next.js desatualizado, 5 CVEs High)** — já é PR **#391** (`fix/upgrade-nextjs-cve-high`),
  aberto. Fora deste change.
- **#2 (webhook Uber Direct fail-open sem signing key)** — já é PR **#396**
  (`fix/uber-direct-webhook-fail-closed`), aberto. Fora deste change.
- **#3 (endpoint `/api/observabilidade/cron` sem auth)** — já corrigido: o arquivo hoje
  (`src/app/api/observabilidade/cron/route.ts:8-11`) exige `Authorization: Bearer $CRON_SECRET`.
  Mergeado via PR #397 (`hardening-seguranca-owasp-medio-baixo`). A auditoria de 24/08 estava
  desatualizada neste ponto. Fora deste change.
- **#7 (rate limit em memória, não distribuído)** — **divergência a resolver com o usuário, não
  assumida aqui.** O change `hardening-seguranca-owasp-medio-baixo` (PR #397) já analisou este
  mesmo achado e decidiu explicitamente **não migrar agora**: o comentário em
  `src/lib/rate-limit.ts:1-6` documenta a limitação e condiciona o upgrade para
  `@upstash/ratelimit` a haver abuso real medido via Sentry — não uma correção pendente. O pedido
  do usuário neste prompt contradiz essa decisão já tomada por outra sessão. Ver seção "Pendências
  de decisão humana" abaixo em vez de uma tarefa de código.
- **#9 (sem Content-Security-Policy)** — já corrigido: `next.config.ts:23-42` tem um header CSP
  completo (`default-src`, `script-src`, `img-src` restrito a `*.supabase.co`, `connect-src`
  restrito a Supabase/Sentry, etc.), com inventário de origens documentado em comentário e só a
  migração para nonce (remover `'unsafe-inline'`) como pendência futura já registrada no próprio
  código. Mergeado via PR #397. Fora deste change.
- **#10 (criptografia de coluna via pgcrypto)** — o próprio pedido do usuário já instrui não
  implementar sem confirmação explícita do time. Vira pendência de decisão, não tarefa de código
  (ver seção final).

Os três achados abaixo foram reconferidos, confirmados como reais, sem PR aberto cobrindo-os, e
não dependem de conta/serviço externo — entram no escopo deste change:

1. **Erro de banco vazando pro client (achado #4 original).** Confirmado por grep de
   `error: error.message` em `src/app/api`: seis rotas devolvem `error.message` do
   Postgres/Supabase direto no JSON de resposta — `src/app/api/asaas/webhook/route.ts:351,408`,
   `src/app/api/observabilidade/cron/route.ts:28` (mesmo depois do fix de auth do PR #397, a rota
   ainda vaza a mensagem crua), `src/app/api/curadoria-ia/route.ts:71`,
   `src/app/api/carrinho/abandono/tick/route.ts:42`, `src/app/api/carrinho/sync/route.ts:28`. Uma
   a mais do que as cinco apontadas originalmente pelo usuário (a de `observabilidade/cron` já
   tinha auth mas não tinha esse fix).
2. **Upload de imagem sem validação server-side (achado #5 original).** Confirmado:
   `src/components/ImageUpload.tsx:58` só tem `accept="image/*"` no `<input>` (dica de UI, não
   bloqueia nada), sem checagem de tamanho/MIME antes de `supabase.storage.upload()`, ao contrário
   de `src/lib/disputa-mediacao-upload.ts`, que já valida.
3. **Validação de input inexistente via zod (achado #6 original).** Confirmado: nenhuma
   dependência `zod`/`yup`/`joi` em `package.json`. Escopo mantido como o usuário pediu: schemas
   novos em `src/lib/checkout/`, `src/lib/coletiva/` e `src/lib/leilao/`, aplicados primeiro nas
   Server Actions que tocam dinheiro (`checkout/actions.ts`, `coletiva/actions.ts`,
   `leilao/actions.ts`), rollout incremental (strangler fig) para o resto.

## What Changes

- `src/app/api/asaas/webhook/route.ts`, `src/app/api/observabilidade/cron/route.ts`,
  `src/app/api/curadoria-ia/route.ts`, `src/app/api/carrinho/abandono/tick/route.ts`,
  `src/app/api/carrinho/sync/route.ts`: resposta ao client passa a ser uma mensagem genérica
  (`"Erro ao processar requisição"`), com `error.message` preservado só em
  `Sentry.captureException`/log server-side. Extraído para um helper único
  (`src/lib/api/erro-generico.ts` + `.test.ts`) para não duplicar o padrão em seis arquivos.
- `src/components/ImageUpload.tsx`: valida tamanho (5MB, mesmo teto de
  `disputa-mediacao-upload.ts`) e MIME type (`image/jpeg`, `image/png`, `image/webp`) antes de
  chamar `supabase.storage.upload()`, reaproveitando a lógica de
  `src/lib/disputa-mediacao-upload.ts` em vez de duplicar validação.
- Buckets `produtos`, `lojas`, `marketplace` no Supabase Storage ganham `file_size_limit` e
  `allowed_mime_types` — configurado via migration SQL (`storage.update_bucket` ou equivalente,
  a confirmar contra o schema real do Storage) para a camada que não dá pra contornar client-side.
- `zod` entra como dependência. Novos arquivos `src/lib/checkout/schemas.ts`,
  `src/lib/coletiva/schemas.ts`, `src/lib/leilao/schemas.ts` com `.test.ts` companheiro cada,
  aplicados em `src/app/checkout/actions.ts`, `src/app/coletiva/actions.ts`,
  `src/app/leilao/actions.ts`. Resto do projeto migra por strangler fig, sem prazo.

## Capabilities

### New Capabilities
- `erro-generico-client`: como rotas de API respondem erro ao client sem vazar detalhe interno de
  banco/Postgres.
- `upload-imagem-validacao`: validação de tamanho/MIME de imagem no client e no bucket, para
  produto/loja/marketplace.
- `validacao-input-zod`: schemas de validação de input nas Server Actions que tocam dinheiro
  (checkout, coletiva, leilão).

## Impact

- `src/lib/api/erro-generico.ts` (novo) + `.test.ts`; seis rotas de API alteradas.
- `src/components/ImageUpload.tsx`; migration nova para `file_size_limit`/`allowed_mime_types` dos
  três buckets.
- `package.json` (+zod); `src/lib/checkout/schemas.ts`, `src/lib/coletiva/schemas.ts`,
  `src/lib/leilao/schemas.ts` (novos) + `.test.ts`; três Server Actions alteradas.
- Fora do escopo (achados #1, #2, #3, #9 já cobertos por PR aberto/mergeado; #7 e #10 pendentes de
  decisão humana — ver abaixo).

## Pendências de decisão humana (fora de código deste change)

- **#7 rate limit distribuído**: o usuário pediu migração para Upstash Redis; outra sessão já
  decidiu adiar até haver abuso real medido. Perguntar ao usuário se quer **reverter essa decisão
  agora** (e então abrir conta Upstash + gravar env vars) ou manter o adiamento documentado.
- **#10 criptografia de coluna (pgcrypto)**: não implementar sem o time confirmar quais colunas de
  PII (CPF/CNPJ, endereço) precisam de criptografia adicional — campo encriptado deixa de ser
  pesquisável/indexável sem trabalho extra, e mudança de schema precisa constar em
  `docs/database.md`.
- **#8 Cloudflare Turnstile** (Prioridade 3 do pedido original): não incluído neste change porque
  depende de conta Cloudflare nova (site key/secret key) que o usuário ainda não indicou onde
  gravar. Pode virar um change separado assim que a conta existir.
