# Plano — fechar os 4 gaps de infra/segurança

Origem: análise de arquitetura de 2026-08-12. Ordem sugerida: **tests em CI →
coletivas/tick → rate limit → CSP** (do mais barato/seguro pro que precisa de
mais inventário e teste manual em produção).

---

## 1. Testes rodando em CI (o mais barato, faça primeiro)

**Situação hoje:** 6 arquivos `*.test.ts` (`src/middleware.test.ts`,
`src/lib/coletiva.test.ts`, `src/lib/geo.test.ts`,
`src/lib/preco-faixa.test.ts`,
`src/app/(admin)/admin/edicao-admin.test.ts`,
`src/app/(parceiro)/parceiro/aceite-termos.test.ts`), todos usando
`node:assert/strict` puro, sem framework. Nenhum roda em CI nem via `npm test`
— só manualmente com `node --experimental-strip-types arquivo.ts`. `ci.yml`
usa Node 20, que **não suporta** `--experimental-strip-types` (exige Node
22.6+), então não dá só para adicionar um `npm test` ao job atual sem
atualizar a versão do Node primeiro.

**Passos:**

1. Criar `scripts/run-tests.mjs` (mesmo estilo dos scripts existentes em
   `scripts/`, sem dependência nova): varre `src/**/*.test.ts` com
   `fs.readdirSync` recursivo, roda cada um em `spawnSync("node", ["--experimental-strip-types", "--no-warnings", arquivo])`,
   agrega falhas e sai com código != 0 se qualquer um falhar. Cross-platform
   (Windows/Linux) por ser Node puro, sem loop de shell — importa porque o
   dev local é Windows.
2. `package.json`: adicionar `"test": "node scripts/run-tests.mjs"`.
3. `.github/workflows/ci.yml`: subir `node-version` de `20` para `22` no job
   `lint-build` (Next 16/React 19 já rodam bem em Node 22; confirmar depois
   que não há outra trava em 20) e adicionar `- run: npm test` depois do
   `npm run lint`.
4. `src/middleware.test.ts` já é um caso especial (CJS + hook de resolução
   para `next/server`) — confirmar que ele passa isolado no runner antes de
   integrar; se o hook de `node:module` não se comportar bem fora do dev
   local, isolar esse arquivo do restante (rodar em processo próprio, que já
   é o caso com `spawnSync` por arquivo).

**Critério de pronto:** `npm test` local reproduz os 6 arquivos, PR trivial
(ex.: quebrar uma asserção de propósito) falha o CI.

---

## 2. `coletivas/tick` com scheduler de verdade

**Situação hoje:** só `/api/carrinho/abandono/tick` está no `vercel.json`
(cron diário — o plano atual do projeto só permite cron diário, não horário).
`/api/coletivas/tick` não tem nenhum agendamento; o fechamento/expiração de
compra coletiva depende de alguém chamar o POST manualmente ou da leitura
preguiçosa da página (RPC on-demand). Isso atrasa o aviso "faltam X horas
para o prazo", que é uma mensagem pensada para granularidade de horas
(`horas_para_prazo` em `lib/agentes/coletiva-etapas.ts`), não de dias.

**Passos:**

1. Espelhar o padrão já usado em `carrinho/abandono/tick/route.ts`: adicionar
   `GET` autorizado por `CRON_SECRET` (o Vercel injeta
   `Authorization: Bearer $CRON_SECRET` sozinho quando a env existe), mantendo
   o `POST` atual com `ASAAS_WEBHOOK_TOKEN` para chamada manual/externa.
2. Adicionar em `vercel.json`:
   ```json
   { "path": "/api/coletivas/tick", "schedule": "0 12 * * *" }
   ```
   Isso já é estritamente melhor que zero agendamento, mas ainda é 1x/dia —
   não resolve a granularidade de horas.
3. **Para granularidade real sem upgrade de plano Vercel:** GitHub Actions
   scheduled workflow (`.github/workflows/coletivas-tick.yml`) rodando de
   hora em hora, chamando o `POST` existente com `ASAAS_WEBHOOK_TOKEN`
   guardado como secret do repo (`secrets.ASAAS_WEBHOOK_TOKEN`):
   ```yaml
   name: coletivas-tick
   on:
     schedule:
       - cron: "0 * * * *"
     workflow_dispatch: {}
   jobs:
     tick:
       runs-on: ubuntu-latest
       steps:
         - run: |
             curl -fsS -X POST https://industria24.com.br/api/coletivas/tick \
               -H "Authorization: Bearer ${{ secrets.ASAAS_WEBHOOK_TOKEN }}"
   ```
   GitHub Actions cron é free, não depende do plano da Vercel, e reaproveita
   o segredo que já existe — nenhuma superfície de auth nova.
4. Decidir se `carrinho/abandono/tick` também merece o mesmo tratamento (hoje
   1x/dia é aceitável pro caso de uso — lembrete de carrinho abandonado não é
   sensível a hora — então não é obrigatório, só avaliar).

**Critério de pronto:** `coletivas/tick` disparando de hora em hora em
produção sem depender de plano pago da Vercel; `vercel.json` com os dois
crons diários como fallback caso o workflow do GitHub caia.

---

## 3. Rate limiting entre instâncias (Upstash)

**Situação hoje:** `lib/rate-limit.ts` é uma janela deslizante em `Map` na
memória do processo — o próprio comentário no código já documenta a
limitação (não compartilhada entre instâncias serverless da Vercel) e já
aponta a solução (`@upstash/ratelimit`) para quando houver abuso real
observado. Só 3 pontos de chamada hoje: `checkout/actions.ts:32` e
`coletiva/actions.ts:21,66` — migração pequena e contida.

**Passos:**

1. Criar conta/DB Upstash Redis (free tier cobre o volume atual — confirmar
   contra tráfego real antes de assumir).
2. `npm install @upstash/ratelimit @upstash/redis`.
3. Novo `lib/rate-limit.ts` com a mesma assinatura pública
   (`checarLimite(chave, max, janelaMs): Promise<boolean>` — vira async,
   então os 3 call sites precisam de `await`) por trás, usando
   `Ratelimit.slidingWindow`. **Manter o fallback em memória quando
   `UPSTASH_REDIS_REST_URL`/`TOKEN` não estiverem configuradas** — mesma
   filosofia do resto do projeto (`isAsaasConfigured`, `isServiceConfigured`):
   funciona sem a integração, só sem a garantia cross-instância, em vez de
   quebrar o build/checkout.
4. Atualizar `.env.example` com as duas novas envs e o comentário de
   contexto (padrão do arquivo: por que existe, o que quebra sem ela).
5. Atualizar os 3 call sites para `await checarLimite(...)`.

**Critério de pronto:** rodar `checkout` e `coletiva/participar` a partir de
duas instâncias diferentes (ou simular com dois processos locais apontando
pro mesmo Redis) e confirmar que o limite é respeitado somado, não por
instância.

---

## 4. Content-Security-Policy

**Situação hoje:** `next.config.ts` já tem um bloco `securityHeaders` (HSTS,
X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
com um comentário adiando CSP "à espera de nonce/inventário de origens do
app". Levantei esse inventário lendo o código (não é exaustivo até rodar em
Report-Only, mas cobre tudo que achei por grep):

| Direção | Origens | Por quê |
|---|---|---|
| `connect-src` | `'self'`, `viacep.com.br`, `NEXT_PUBLIC_SUPABASE_URL` (REST/Auth/Realtime), ingest do Sentry | `CepBar.tsx` (client) chama ViaCEP direto do browser; `supabase-js` no client fala com o projeto Supabase; Sentry SDK envia telemetria |
| `img-src` | `'self'`, `data:`, `NEXT_PUBLIC_SUPABASE_URL` | imagens de produto/loja são `<img>` puro (não usam `next/image`) apontando pro Storage do Supabase, mesmo host da API |
| `frame-src` | `www.youtube.com` | 2 embeds (`seller/tutoriais`, `vender-como-afiliado`) |
| `script-src` | `'self'` | nenhum `<script src=externo>`; sem GA/GTM/reCAPTCHA/Hotjar (busquei, não achei). O `<script type="application/ld+json">` do breadcrumb (JSON-LD) **não é coberto por `script-src`** — não é script executável, então não precisa de nonce |
| `style-src` | `'self' 'unsafe-inline'` | 8 arquivos usam `style={{...}}` inline (barras de progresso etc.) — refatorar pra CSS puro é possível mas é outro PR; por ora aceitar `'unsafe-inline'` em style é uma concessão pragmática, não abre XSS de script |
| `font-src` | `'self'` | `next/font/google` (Archivo, Inter) faz self-host em build, não busca do Google em runtime |
| `object-src` | `'none'` | sem Flash/plugins |
| `base-uri`, `form-action` | `'self'` | padrão restritivo |
| `frame-ancestors` | `'self'` | equivalente moderno do `X-Frame-Options` já presente |

**Passos:**

1. Montar o header dinamicamente em `next.config.ts` (já lê `process.env`
   ali para o Sentry), interpolando o host de `NEXT_PUBLIC_SUPABASE_URL` nos
   diretórios `connect-src`/`img-src`.
2. **Fase 1 — Report-Only:** subir como
   `Content-Security-Policy-Report-Only` por 1-2 semanas com
   `report-uri`/`report-to` apontando pro Sentry (`Sentry.init` já está
   configurado, dá para usar a integração de CSP report do próprio Sentry ou
   um endpoint próprio em `/api/csp-report`) para pegar origem que o grep não
   viu (ex.: algo carregado só em uma página específica que não bati).
3. Relaxar em dev: como `securityHeaders` roda em `next dev` também, e o
   Fast Refresh do Next pode precisar de `'unsafe-eval'`, condicionar esse
   token a `process.env.NODE_ENV !== "production"` para não travar o
   ambiente local.
4. **Fase 2 — enforce:** depois de confirmar zero violação inesperada nos
   reports, trocar `Content-Security-Policy-Report-Only` por
   `Content-Security-Policy` de verdade.
5. Documentar no próprio `next.config.ts` (padrão do arquivo) por que cada
   origem está na lista — se alguém adicionar um embed novo (outro vídeo,
   outro widget) sem atualizar a CSP, quebra em produção de forma óbvia
   (bloqueado, não silencioso), e o comentário economiza o replay de todo
   esse levantamento.

**Critério de pronto:** CSP enforced em produção, zero relatório de violação
por 1 semana consecutiva, todas as páginas testadas manualmente (checkout,
login com Google, upload de imagem, tutoriais com YouTube, busca de CEP).

---

## Resumo de esforço

| Gap | Esforço | Risco de regressão |
|---|---|---|
| 1. Testes em CI | pequeno (1 script + 1 linha de CI) | baixo |
| 2. `coletivas/tick` scheduler | pequeno (espelha padrão existente) | baixo |
| 3. Rate limit Upstash | médio (conta nova + 3 call sites async) | baixo-médio |
| 4. CSP | médio-alto (inventário + rollout faseado) | médio (só se algo escapou do grep) |
