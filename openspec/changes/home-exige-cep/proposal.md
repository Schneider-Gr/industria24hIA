## Why

Decisão do dono em 08/09/2026, com referência gravada em Jam (`jam.dev/c/4f96632d-2a89-483b-bae5-168bbad41f9d`): a home deve seguir o Mercado Livre e **não listar produto nenhum antes do CEP**. No ML, a home sem CEP mostra só banner e institucional; com o CEP confirmado, passa a mostrar produto.

Até aqui a home listava tudo para quem não tinha CEP, e o pedido de CEP era um aviso que dava para ignorar. Como a plataforma entrega por região e a cobertura é declarada por produto, listar sem CEP mostra um catálogo que em boa parte não chega ao visitante.

## What Changes

- Sem CEP a home não renderiza nenhuma seção de produto: produtos recentes, desconto progressivo, supermercado, galerias cadastráveis e venda futura ficam de fora. Permanecem o banner, as categorias, as lojas, os banners cadastráveis e o institucional.
- `PortaoCep` e `CardLocalizacao` passam a valer para visitante logado também: sem CEP a home não tem como saber o que chega até ele. O link "entrar" sai da faixa, que agora aparece para quem já está logado.
- Copy dos dois ajustado: eles são o caminho para a vitrine, não um aviso opcional.
- A consulta de cobertura não roda sem CEP, o que economiza uma leitura no caminho da home.

Busca e categoria continuam listando sem CEP, como no ML: quem chega por busca já expressou intenção, e cortar ali quebraria SEO e link compartilhado.

## Capabilities

### Modified Capabilities
- `cobertura-entrega-produto`: a home passa a exigir o CEP para listar produto.

## Impact

Sem migration e sem mudança de RLS. A home sem CEP perde as seções de produto, então o CEP passa a ser o primeiro passo obrigatório da jornada de compra. `supabase.auth.getUser()` continua sendo chamado porque revalida o cookie de auth, mas a sessão deixou de decidir o que a home mostra.
