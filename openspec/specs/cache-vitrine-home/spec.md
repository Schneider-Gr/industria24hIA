# cache-vitrine-home Specification

## Purpose
Reduzir round-trips ao Supabase na home pública (rota de maior tráfego, `force-dynamic` por depender de cookie de sessão/CEP) cacheando a fatia de dados que é idêntica para qualquer visitante, sem cachear o que depende de sessão ou CEP salvo.
## Requirements
### Requirement: Dados não-personalizados da home passam por cache de leitura
O sistema SHALL servir catálogo de produtos recentes, lojas, categorias, banners de destaque, promoções com desconto, itens de mercado futuro e produtos da seção Supermercado a partir de um cache de leitura com TTL, em vez de consultar o Supabase a cada request.

#### Scenario: Duas requisições consecutivas à home dentro do TTL
- **WHEN** dois visitantes sem sessão e sem CEP salvo acessam a home dentro da janela de revalidação (60s)
- **THEN** a segunda requisição reaproveita o resultado da primeira, sem round-trip novo ao Supabase para os dados não-personalizados

#### Scenario: Requisição após expirar o TTL
- **WHEN** uma requisição chega após a janela de revalidação expirar
- **THEN** o sistema busca os dados de novo no Supabase e atualiza o cache

### Requirement: Dado dependente de cookie nunca passa pelo cache compartilhado
O sistema SHALL NOT incluir no cache de leitura compartilhado nenhum dado que dependa do cookie de sessão do usuário ou do CEP salvo (filtro de cobertura por loja, galerias filtradas por CEP, sessão de usuário).

#### Scenario: Dois visitantes com CEPs diferentes
- **WHEN** dois visitantes com CEPs salvos diferentes acessam a home dentro da mesma janela de cache
- **THEN** cada um vê o filtro de cobertura por loja aplicado ao próprio CEP, mesmo reaproveitando o mesmo cache de dados-base

### Requirement: Cliente usado no cache não carrega cookie
O sistema SHALL usar um client Supabase sem cookie (anon, `persistSession: false`) para qualquer leitura que passe pelo cache compartilhado, nunca o client de sessão por-request.

#### Scenario: Função cacheada é chamada
- **WHEN** `unstable_cache` invoca a função de leitura da home
- **THEN** a função usa `createPublicClient()`, não o client de `src/lib/supabase/server.ts`

