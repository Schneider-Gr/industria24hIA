## 1. Implementação

- [x] 1.1 `src/lib/cache/vitrine-home.ts`: paralelizar as 4 seções
      pós-processamento (produtos+imagem, desconto progressivo, mercado
      futuro, supermercado) com `Promise.all`
- [x] 1.2 `src/lib/galerias.ts`: extrair `resolverGaleria` e resolver todas
      as galerias ativas com `Promise.all` em vez de loop `for`
- [x] 1.3 `src/app/page.tsx`: `supabase.auth.getUser()` e
      `obterVitrineHomeCacheada()` em `Promise.all`

## 2. Verificação

- [x] 2.1 `tsc --noEmit` sem erros
- [x] 2.2 `npm run lint` sem erros novos
- [x] 2.3 `vitest run src/lib/cache/vitrine-home.test.ts` — 1/1 passa
- [x] 2.4 `npm run build` limpo
- [ ] 2.5 Issue #333 + branch `fix/vitrine-home-waterfall-queries` + PR
      referenciando a issue

## 3. Fechamento

- [ ] 3.1 `openspec archive paralelizar-queries-vitrine-home` após merge
