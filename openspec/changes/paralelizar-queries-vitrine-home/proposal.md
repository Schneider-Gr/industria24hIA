## Why

Investigação de lentidão na home/vitrine (issue #333, 2026-08-19), continuação
do PRD 019: a hipótese de "painel lento por FK sem índice" já tinha sido
descartada (banco de 37MB, 100% cache hit no Postgres). A causa real é
waterfall estrutural — não N+1 por linha, e sim uma cadeia de `await`
sequenciais onde os dados não dependem entre si, só foram escritos em fila.

A change `cache-vitrine-home` (mesmo repo, ainda não arquivada) já resolveu a
maior parte disso: `obterVitrineHomeCacheada()` reduz o custo por request de
~15 para ~3 round-trips na maioria das visitas (cache HIT, TTL 60s). Restam
dois pontos de waterfall que essa mudança não cobriu:

1. Dentro de `carregarVitrineHomeBase` (a função que roda a cada
   revalidação, uma vez por 60s): 4 seções pós-processamento (produto_imagens
   dos recentes, desconto progressivo, mercado futuro, supermercado) ainda
   rodam em fila — ~7 round-trips sequenciais — mesmo sendo independentes
   entre si.
2. Fora do cache, em todo request (path que depende de cookie/sessão,
   correto ficar fora): `buscarGaleriasVitrine` resolve cada `vitrine_galeria`
   ativa num loop `for` sequencial (2-3 queries por galeria), e
   `supabase.auth.getUser()` roda antes de `obterVitrineHomeCacheada()` sem
   necessidade — nenhum dos dois depende do outro.

## What Changes

- `src/lib/cache/vitrine-home.ts`: as 4 seções pós-processamento passam a
  rodar em `Promise.all`, cada uma resolvendo sua própria cadeia interna
  (produto+imagem) em paralelo com as demais.
- `src/lib/galerias.ts`: `buscarGaleriasVitrine` resolve todas as galerias
  ativas em `Promise.all` (função `resolverGaleria` extraída, uma por
  galeria) em vez de um loop `for` sequencial.
- `src/app/page.tsx`: `supabase.auth.getUser()` e `obterVitrineHomeCacheada()`
  disparam juntos em `Promise.all` — nenhum depende do outro.
- Sem mudança de schema, RLS, cache (TTL/tag inalterados) ou regra de
  negócio — só a forma de disparo das queries já existentes.

## Capabilities

### Modified Capabilities
- `cache-vitrine-home`: a função de leitura cacheada (`carregarVitrineHomeBase`)
  passa a resolver suas seções internas em paralelo, sem mudar o que é
  cacheado nem o TTL.

## Impact

- `src/lib/cache/vitrine-home.ts`, `src/lib/galerias.ts`, `src/app/page.tsx`.
- Nenhuma migration, nenhuma mudança de schema, nenhuma mudança de RLS.
- Reduz o custo da revalidação (1x/60s) de ~7 para ~3 round-trips em paralelo,
  e o custo por request fora do cache (galerias + sessão) de 2 waterfalls
  sequenciais para 1-2 rodadas paralelas.
