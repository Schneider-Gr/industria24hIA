## Purpose

Eliminar waterfall estrutural remanescente na leitura de dados da
home/vitrine (issue #333): seções e galerias independentes entre si que
disparam suas queries ao Supabase em fila, não em paralelo — nos dois
trechos que a cache de leitura (`cache-vitrine-home`) não elimina, porque
rodam a cada revalidação ou a cada request dependente de cookie.

## ADDED Requirements

### Requirement: Seções independentes da leitura cacheada da home resolvem em paralelo
O sistema SHALL disparar as queries de produtos recentes+imagem, desconto
progressivo, mercado futuro e seção Supermercado simultaneamente dentro de
`carregarVitrineHomeBase`, não em sequência, sempre que nenhuma dessas
seções depender do resultado de outra.

#### Scenario: Revalidação da leitura cacheada da home
- **WHEN** `obterVitrineHomeCacheada()` expira o TTL e chama
  `carregarVitrineHomeBase` de novo
- **THEN** as queries de produtos recentes, desconto progressivo, mercado
  futuro e supermercado disparam ao mesmo tempo, não uma após a outra

### Requirement: Galerias ativas da vitrine resolvem em paralelo
O sistema SHALL resolver todas as galerias ativas retornadas por
`buscarGaleriasVitrine` simultaneamente, uma chamada por galeria, não em
loop sequencial — cada galeria já é independente das demais.

#### Scenario: Mais de uma galeria ativa em `vitrine_galerias`
- **WHEN** existem N galerias com `ativo = true`
- **THEN** as N resoluções (cada uma com suas 1-3 queries internas)
  disparam em paralelo, e o tempo total não escala linearmente com N

### Requirement: Leitura de sessão e leitura cacheada da home não se bloqueiam
O sistema SHALL disparar `supabase.auth.getUser()` e
`obterVitrineHomeCacheada()` simultaneamente na home, já que nenhum dos
dois depende do resultado do outro.

#### Scenario: Requisição à home, cache HIT ou MISS
- **WHEN** um visitante acessa a home
- **THEN** a leitura de sessão e a leitura do catálogo (cacheado ou não)
  disparam juntas, não uma depois da outra
