## 1. Scan de dependências no CI
- [ ] 1.1 Adicionar `.github/dependabot.yml` (ecosystem `npm`, diretório `/`, schedule semanal)
- [ ] 1.2 Adicionar passo `npm audit --audit-level=high` no job `lint-build` do `ci.yml`

## 2. Autenticação na rota de observabilidade de cron
- [ ] 2.1 `src/app/api/observabilidade/cron/route.ts` exige `Authorization: Bearer <token>`, mesmo
      padrão de `carrinho/abandono/tick` e `coletivas/tick`

## 3. Content-Security-Policy
- [ ] 3.1 Levantar inventário real de origens (script/style/img/connect/frame) usadas pelo app:
      Supabase, Sentry, fontes, Google Maps/CEP, WhatsApp/Meta, Asaas, etc.
- [ ] 3.2 Adicionar header `Content-Security-Policy` em `next.config.ts` com base no inventário

## 4. Comparação constant-time no webhook Asaas
- [ ] 4.1 `src/app/api/asaas/webhook/route.ts` troca `!==` por `crypto.timingSafeEqual`, mesmo
      padrão de `uber-direct`/`bubblewhats`
- [ ] 4.2 `.test.ts` cobrindo token correto/incorreto/tamanho diferente

## 5. Rate limit no catálogo público
- [ ] 5.1 `src/app/api/categorias/route.ts` chama `checarLimite` por IP
- [ ] 5.2 `src/app/api/busca-preview/route.ts` chama `checarLimite` por IP

## 6. Fechamento
- [ ] 6.1 `npm run lint` + `npm run test` passando
- [ ] 6.2 Abrir PR referenciando a Issue criada para este change
