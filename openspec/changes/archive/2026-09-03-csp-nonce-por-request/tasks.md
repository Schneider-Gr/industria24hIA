## 1. Nonce por request
- [x] 1.1 `src/proxy.ts` gera nonce (`crypto.randomUUID()` base64) por request
- [x] 1.2 CSP emitido no `proxy.ts` (sai do `next.config.ts` estático); nas rotas estritas o CSP
      vai também no request header, de onde o Next 16 extrai o nonce
- [x] 1.3 `script-src` sem `'unsafe-inline'` (nonce + `'strict-dynamic'`) nas rotas autenticadas;
      público mantém `'unsafe-inline'`
- [x] 1.4 Turnstile: coberto por `'strict-dynamic'` (propagação) + está kill-switched (#476) e
      fora das rotas estritas — sem alteração no `TurnstileWidget`

## 2. Validação
- [x] 2.1 QA em prod logado (browser-harness): `/admin` → CSP `script-src 'self' 'nonce-<v>'
      'strict-dynamic'`, 49/49 `<script>` com nonce, React montado
- [x] 2.2 Header em prod sem `'unsafe-inline'` nas rotas autenticadas; `/` mantém `'unsafe-inline'`
- [x] 2.3 `npm run lint` + `npm run test` + `npm run build` verdes (PR #478)

## 3. Fechamento
- [x] 3.1 PR #478 mergeado (`dc863fb`), `Closes #477`; Issue #423 comentada (US01 feito)
- [x] 3.2 Escopo divergente do PRD registrado na emenda de US01 do PRD 027

## Fora desta change
- US02 do PRD 027 (signing key do webhook Uber Direct no Vercel + auth da rota de cron de
  observabilidade) — segue aberto na Issue #423.
