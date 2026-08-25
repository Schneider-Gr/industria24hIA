## 1. Nonce por request
- [ ] 1.1 Middleware gera nonce (`crypto.randomUUID()`) por request
- [ ] 1.2 Propagar nonce até `src/app/layout.tsx` (header customizado ou `headers()`)
- [ ] 1.3 CSP em `next.config.ts`/middleware usa `'nonce-<valor>'` em vez de `'unsafe-inline'` em `script-src`/`style-src`
- [ ] 1.4 `next/script` (Sentry) e `TurnstileWidget` recebem o nonce explicitamente

## 2. Validação
- [ ] 2.1 QA manual em preview: vitrine, seller, admin, checkout, login/cadastro (Turnstile) sem regressão visual/funcional
- [ ] 2.2 Confirmar header `Content-Security-Policy` em produção sem `'unsafe-inline'`
- [ ] 2.3 `npm run lint` + `npm run test` + `npm run build` passando

## 3. Fechamento
- [ ] 3.1 Abrir PR referenciando a Issue desta change
