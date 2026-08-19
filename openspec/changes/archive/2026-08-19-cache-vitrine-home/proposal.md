## Why

Auditoria de camadas de cache (2026-08-19): o projeto tem ISR (`export const revalidate`) em 6 rotas públicas (`categoria`, `categoria/[id]`, `loja/[id]`, `produto/[id]`, `termos/[slug]`, `api/categorias`), mas **nenhum cache de query** — nem `unstable_cache`, nem `React.cache()`, nem cache em memória/Redis. A home (`src/app/page.tsx`), a página de maior tráfego, é `force-dynamic` e faz ~15 round-trips ao Supabase por request, sem nenhum atalho: catálogo de produtos, lojas, categorias, banners, promoções, mercado futuro e a seção Supermercado são todos idênticos para qualquer visitante não-logado sem CEP salvo, mas são buscados de novo a cada acesso.

A home não pode virar ISR de rota inteira porque `src/lib/supabase/server.ts` chama `cookies()` (necessário para sessão de usuário e CEP salvo), o que força `force-dynamic` na rota inteira no Next.js — é a mesma restrição já documentada em `src/lib/supabase/public.ts`. A saída correta é cachear só a fatia de dados não-personalizada com `unstable_cache`, mantendo fora do cache o que depende de cookie (filtro por CEP, sessão, galerias dependentes de CEP, flags de venda futura/coletiva por produto).

## What Changes

- Novo módulo `src/lib/cache/vitrine-home.ts`: extrai a leitura não-personalizada da home (config do marketplace, categorias, lojas, produtos recentes + imagens, promoções com desconto, mercado futuro, seção Supermercado, banners de destaque) para uma função pura `carregarVitrineHomeBase(supabase)`, e expõe `obterVitrineHomeCacheada()` — a mesma função com `createPublicClient()` (anon, sem cookies) envolvida em `unstable_cache` (`revalidate: 60s`, tag `vitrine-home`).
- `src/app/page.tsx` passa a chamar `obterVitrineHomeCacheada()` em vez de rodar as 8 queries + os 3 blocos de join manual (desconto, mercado futuro, supermercado) inline a cada request. O filtro de cobertura por CEP (`cobreLoja`), sessão de usuário, galerias dependentes de CEP e flags rápidas de produto continuam fora do cache, aplicados sobre o resultado cacheado.
- Extrai `primeiraImagemPorProduto` (helper puro, estava duplicado 4x inline em `page.tsx` + 1x em `src/lib/galerias.ts`) para o novo módulo, com teste unitário.
- **Sem `revalidateTag` nas actions de admin/seller** que escrevem essas tabelas — ponytail deliberado, mesmo padrão já aceito no projeto para o ISR de `produto/[id]`/`loja/[id]` (nenhum dos quais invalida por tag hoje). TTL de 60s é o teto aceito de defasagem entre uma edição no admin e o reflexo na home.

## Capabilities

### New Capabilities
- `cache-vitrine-home`: cache de leitura para os dados públicos e não-personalizados da home do marketplace.

## Impact

- `src/app/page.tsx`: reduz de ~15 para ~3 round-trips ao Supabase por request não-cacheado (config/categorias/lojas/produtos/promoções/vendas-futuras/faixas-cep/banners/imagens saem do caminho crítico da maioria das visitas).
- `src/lib/cache/vitrine-home.ts` (novo) + `src/lib/cache/vitrine-home.test.ts` (novo).
- Nenhuma migration, nenhuma mudança de schema, nenhuma mudança de RLS.
- Trade-off aceito: até 60s de defasagem entre uma mudança no admin (novo produto, banner, promoção) e o reflexo na home pública. Painéis admin/seller/afiliado seguem sem cache algum — dado autenticado/transacional, correto manter dinâmico.
