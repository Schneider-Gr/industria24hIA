## 1. Implementação

- [x] 1.1 Criar `src/lib/cache/vitrine-home.ts`: `carregarVitrineHomeBase(supabase)` extraindo o bloco não-personalizado de `page.tsx`
- [x] 1.2 Extrair `primeiraImagemPorProduto` (deduplicada de 4 usos inline + `galerias.ts`)
- [x] 1.3 `obterVitrineHomeCacheada()` — `unstable_cache` com `createPublicClient()`, `revalidate: 60`, tag `vitrine-home`
- [x] 1.4 Atualizar `src/app/page.tsx` para consumir a versão cacheada, mantendo filtro de CEP/sessão fora do cache
- [x] 1.5 Escrever `.test.ts` de `primeiraImagemPorProduto` (Red → Green)

## 2. Verificação

- [x] 2.1 `npm run test` — 19/19 passam
- [x] 2.2 `tsc --noEmit` sem erros
- [x] 2.3 `npm run lint` sem erros novos (só warning pré-existente de `Link` não usado, não introduzido por este change)
- [ ] 2.4 `npm run build` limpo (rodando)
- [ ] 2.5 Abrir Issue + branch + PR referenciando esta spec

## 3. Fechamento

- [ ] 3.1 `openspec archive cache-vitrine-home` após merge
