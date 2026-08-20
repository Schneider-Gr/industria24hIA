## ADDED Requirements

### Requirement: Permalink decorativo com nome do produto/loja/categoria
As páginas `produto/[id]`, `loja/[id]` e `categoria/[id]` DEVEM aceitar tanto o formato antigo (`{uuid}`) quanto o novo (`{uuid}-{slug-do-nome}`) no param de rota, extraindo sempre os 36 primeiros caracteres como o id real para a busca no banco.

#### Scenario: Link antigo sem slug continua funcionando
- **WHEN** um crawler ou usuário acessa `/produto/{uuid}` (formato publicado antes desta mudança)
- **THEN** a página carrega o produto normalmente, sem redirect

#### Scenario: Link novo com slug carrega o produto certo
- **WHEN** um usuário acessa `/produto/{uuid}-{qualquer-texto}`
- **THEN** a página carrega o produto correspondente ao uuid, ignorando o texto do slug

### Requirement: Canonical aponta pro permalink com slug
`generateMetadata` de produto/loja/categoria/coletiva DEVE emitir `alternates.canonical` com a URL no formato `{uuid}-{slug-do-nome}`, independentemente de qual formato foi usado para acessar a página.

#### Scenario: Canonical consolida as duas formas de URL
- **WHEN** um crawler indexa tanto `/produto/{uuid}` quanto `/produto/{uuid}-{slug}`
- **THEN** ambas emitem o mesmo `<link rel="canonical">` apontando pra `/produto/{uuid}-{slug}`

### Requirement: Dado estruturado (JSON-LD) real
As páginas de produto e loja DEVEM emitir JSON-LD (`Product`/`Offer` em produto, dados de negócio em loja) com valores reais do Supabase — nunca um valor inventado quando o dado não existe (ex.: sem avaliação cadastrada, não emitir `aggregateRating`).

#### Scenario: Produto aprovado com estoque emite Offer com disponibilidade correta
- **WHEN** a página de um produto aprovado com `estoque_atual > 0` renderiza
- **THEN** o JSON-LD inclui `Offer.availability` como `https://schema.org/InStock`

#### Scenario: Produto sem avaliação não inventa nota
- **WHEN** um produto não tem nenhuma avaliação registrada
- **THEN** o JSON-LD não inclui `aggregateRating`

### Requirement: Imagem social real
`og:image` e `twitter:image` de produto/loja DEVEM usar a imagem real do item (primeira imagem por `ordem` em produto; logotipo/banner em loja) em vez do fallback genérico do layout raiz.

#### Scenario: Produto com imagem cadastrada
- **WHEN** um produto tem ao menos uma linha em `produto_imagens`
- **THEN** `og:image` da página desse produto é a URL dessa imagem, não a logo genérica
