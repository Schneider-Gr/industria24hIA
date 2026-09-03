## 1. Reduzir o TTL do access token
- [ ] 1.1 Painel Supabase → Authentication → Sessions/Tokens: "Access token (JWT) expiry" de
      3600s para 900s
- [ ] 1.2 QA em prod: logar num painel, esperar >15min de inatividade, confirmar que a próxima
      navegação renova via refresh sem deslogar (o `proxy.ts` já chama `getUser()` a cada request)

## 2. Confirmar rotação de refresh token
- [ ] 2.1 Painel Supabase → Authentication → Sessions: confirmar "Refresh token rotation" ligado
      e "Reuse interval" no default
- [ ] 2.2 Registrar o estado encontrado no `spec.md` (é o comportamento default, mas precisa ser
      verificado, não assumido)

## 3. Sentry replay não vaza o cookie
- [ ] 3.1 Revisar config do `@sentry/nextjs` (replay): confirmar `maskAllText`/`blockAllMedia`
      e que `networkCaptureBodies`/headers não incluem `cookie`
- [ ] 3.2 Se necessário, adicionar `cookie` à lista de headers ignorados do replay

## 4. Fechamento
- [ ] 4.1 `spec.md` atualizado com o estado verificado dos itens 1–3
- [ ] 4.2 PR referenciando a Issue #487
- [ ] 4.3 `openspec archive hardening-sessao-token-xss` após o merge
