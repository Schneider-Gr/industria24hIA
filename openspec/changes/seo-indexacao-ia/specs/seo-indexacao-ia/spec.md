## ADDED Requirements

### Requirement: Sitemap dinâmico do marketplace público
O sistema DEVE expor `/sitemap.xml` listando as páginas públicas do
marketplace (institucionais + produto, loja, categoria, coletiva), com URL
derivada sempre de um registro real do Supabase — nunca uma URL inventada
ou de exemplo.

#### Scenario: Produto aprovado aparece no sitemap
- **WHEN** um produto tem `status_produto = "Aprovado"`
- **THEN** `/sitemap.xml` inclui `https://industria24.com.br/produto/{id}`

#### Scenario: Produto reprovado/pendente não aparece no sitemap
- **WHEN** um produto tem `status_produto` diferente de `"Aprovado"`
- **THEN** `/sitemap.xml` não inclui a URL desse produto

### Requirement: robots.txt bloqueando áreas privadas
O sistema DEVE expor `/robots.txt` liberando rastreamento das rotas
públicas de vitrine e bloqueando explicitamente áreas autenticadas
(admin, seller, afiliado, parceiro, entregador) e fluxos de
transação (checkout, carrinho, pedido, mensagens, login, cadastro).

#### Scenario: Robô de busca consulta robots.txt
- **WHEN** um crawler requisita `/robots.txt`
- **THEN** a resposta aponta `sitemap: https://industria24.com.br/sitemap.xml`
- **AND** lista `/admin`, `/seller`, `/afiliado`, `/parceiro`, `/checkout`, `/carrinho` como disallow

### Requirement: llms.txt para assistentes de IA
O sistema DEVE expor `/llms.txt` (estático, em `public/`) descrevendo em
linguagem natural o que é o marketplace, para quem é e quais produtos/
serviços oferece, com links para as páginas públicas correspondentes.

#### Scenario: Assistente de IA busca resumo do site
- **WHEN** um agente de IA requisita `https://industria24.com.br/llms.txt`
- **THEN** recebe um documento em Markdown descrevendo o marketplace, sem dado inventado (preço, disponibilidade) que precise de consulta em tempo real

### Requirement: Metadata real nas páginas de vitrine pública
As páginas `produto/[id]`, `loja/[id]`, `categoria/[id]` e `coletiva/[id]`
DEVEM gerar `title` e `description` a partir do registro real exibido na
página (nome do produto/loja/categoria, preço quando aplicável) — nunca o
fallback genérico ("Indústria 24h") do layout raiz.

#### Scenario: Página de produto existente
- **WHEN** um crawler ou usuário acessa `/produto/{id}` de um produto aprovado
- **THEN** o `<title>` da página é o nome do produto
- **AND** a `<meta name="description">` descreve o produto ou seu preço, não a descrição genérica do site

#### Scenario: Produto inexistente ou não aprovado
- **WHEN** o `id` não corresponde a um produto aprovado
- **THEN** `generateMetadata` retorna vazio e a página segue o fluxo normal de `notFound()`

### Requirement: Feed de produtos para Google Merchant Center
O sistema DEVE expor `/feed-produtos.xml` no formato RSS 2.0 do Google
Shopping, listando produtos com `status_produto = "Aprovado"` e dados reais
do Supabase (nome, descrição, preço, imagem, disponibilidade) — sem GTIN/
marca inventados quando a coluna não existe no schema.

#### Scenario: Produto aprovado com estoque aparece no feed
- **WHEN** um produto tem `status_produto = "Aprovado"` e `estoque_atual > 0`
- **THEN** o item no feed tem `g:availability` igual a `in stock`
- **AND** `g:identifier_exists` igual a `false` (schema atual não tem marca/GTIN)

#### Scenario: Produto sem estoque aparece com disponibilidade correta
- **WHEN** um produto aprovado tem `estoque_atual = 0`
- **THEN** o item no feed tem `g:availability` igual a `out of stock`

#### Scenario: Produto não aprovado não aparece no feed
- **WHEN** um produto tem `status_produto` diferente de `"Aprovado"`
- **THEN** ele não aparece em `/feed-produtos.xml`
