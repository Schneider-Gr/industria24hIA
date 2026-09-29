---
prd_number: "057"
status: rascunho
priority: média
created: 2026-09-29
issue: ""
depends_on: []
references:
  - "https://github.com/Schneider-Gr/industria24hIA/pull/832" – implementação do link /produto/<slug>
  - "https://github.com/Schneider-Gr/industria24hIA/pull/833" – migration renumerada para 0208 (colisão de prefixo)
  - "supabase/migrations/0208_slug_produto.sql" – slug único, gerado na criação, com sufixo por ordem de criação
  - "src/proxy.ts" – redirect 308 do link antigo
  - "src/lib/slug.ts" – permalinkProduto e detecção do formato antigo
  - "https://github.com/Schneider-Gr/industria24hIA/pull/821" – SEO técnico (noindex, sitemap) que este PRD complementa
---

# PRD 057: Link amigável de produto

## 1. Contexto

- **Produto/área**: vitrine pública da Indústria 24h (página de produto) e todo lugar que divulga link de produto: afiliados, anúncios da Meta, WhatsApp, QR code impresso, Google e feed de produtos.
- **Estado atual**: o link de produto é `/produto/<uuid>-<nome>`, por exemplo `/produto/1ef6f6db-7d3a-4a2e-a67d-e8efec3250a5-broa-de-milho`. O nome no fim é decorativo e o produto é encontrado pelos 36 caracteres do UUID.
- **Problema**: o link é longo e ilegível para quem compartilha e para quem recebe. Um comprador não confia num link cheio de números no WhatsApp, o afiliado não consegue ditar nem lembrar o link, e o anúncio mostra uma URL feia. O catálogo tem muito nome repetido (226 produtos com 117 nomes distintos; o mesmo café aparece em 12 cadastros), então o nome sozinho não identifica o produto.

## 2. Solução Proposta

### Visão de produto

- O link de produto passa a ser só o nome: `/produto/broa-de-milho`.
- Todo link já divulgado continua funcionando: o formato antigo leva direto ao novo, sem perder a atribuição do afiliado nem a origem do anúncio.
- O link nasce com o produto e não muda depois, então o que foi impresso ou compartilhado nunca quebra.
- Nome repetido é diferenciado por um número no fim, sem pedir nada ao seller.

### Decisões de produto

1. **Só o nome no link, sem código curto** (ex.: não `broa-de-milho-1ef6f6db`). Motivo: escolha da dona do produto (29/09) pela legibilidade máxima, mesmo sendo a opção de maior custo de implementação.
2. **O link é fixo desde a criação e não acompanha renomeação.** Motivo: link de afiliado, QR code impresso e resultado do Google não podem quebrar; o nome exibido na página continua sendo o nome atual.
3. **Nome repetido ganha `-2`, `-3`… por ordem de criação**; o cadastro mais antigo fica com o nome limpo. Motivo: regra previsível, que não pede ação do seller.
4. **Link antigo redireciona de forma permanente para o novo**, levando junto todos os parâmetros (`?ref=` do afiliado, `utm_*` dos anúncios). Motivo: preservar comissão de afiliado e atribuição de campanha já em circulação, e fazer o Google transferir a relevância para a URL nova.

### Fora do escopo

- Link amigável de loja, categoria e compra coletiva: continuam com UUID no link *(premissa — confirme ou corrija; candidato a PRD próprio)*.
- Seller ou admin editar o link manualmente *(premissa — confirme ou corrija)*.
- Trocar os links de áreas logadas (carrinho, favoritos, pedidos, painéis): continuam no formato antigo e passam pelo redirecionamento. São páginas fora do Google, então não afetam busca.
- Busca que ignora acento (ex.: "cafe" encontrar "café"): problema pré-existente, independente do link.

## 3. Funcionalidades

### US01: Abrir produto pelo link com o nome

Como comprador, quero abrir um produto por um link com o nome dele, para confiar no que estou clicando e conseguir compartilhar.

**Rules:**
- O link de produto é `/produto/<nome-em-minúsculas-sem-acento-com-hífens>`.
- Caracteres que não são letra ou número viram hífen; acentos são removidos; o link tem no máximo 80 caracteres.
- Todo lugar público que mostra produto usa o link novo: vitrines, busca, sugestões do carrinho, compra coletiva, sitemap, feed de produtos e o endereço canônico da página.

**Edge cases:**
- Link com nome que não existe → página de produto não encontrado, fora do índice do Google.
- Produto existe mas está reprovado ou sem preço → mesma página de não encontrado.
- Nome só com símbolos ou vazio → link `produto`, `produto-2`… *(premissa — confirme ou corrija)*.

### US02: Nome repetido gera link diferente

Como seller, quero cadastrar um produto com o mesmo nome de outro, sem precisar pensar no link, para não travar o cadastro.

**Rules:**
- Cada produto tem um link único em todo o catálogo, e não só dentro da loja.
- O primeiro cadastro de um nome fica com o link limpo; os seguintes recebem `-2`, `-3`… na ordem em que foram criados.
- O link é definido no momento da criação do produto.

**Edge cases:**
- Dois sellers salvam produtos com o mesmo nome no mesmo instante → um salva e o outro recebe erro e precisa salvar de novo *(premissa — confirme ou corrija; volume atual torna isso raro)*.
- Produto `-2` excluído → o próximo cadastro com o mesmo nome reaproveita o `-2` (primeiro número livre). Um link antigo de afiliado para o `-2` excluído passa a abrir o produto novo *(premissa — confirme ou corrija; alternativa é nunca reaproveitar número)*.

### US03: Renomear sem quebrar link

Como seller, quero corrigir o nome do meu produto sem quebrar os links que já divulguei.

**Rules:**
- Renomear o produto não altera o link.
- A página mostra sempre o nome atual, mesmo que o link tenha o nome antigo.

**Edge cases:**
- Seller renomeia "Broa" para "Pão de Milho" → o link continua `/produto/broa` e a página mostra "Pão de Milho".

### US04: Link antigo continua funcionando

Como afiliado, quero que os links que já divulguei continuem funcionando e me dando comissão.

**Rules:**
- Qualquer link no formato antigo (`/produto/<uuid>` ou `/produto/<uuid>-<nome>`) redireciona de forma permanente para o link novo do mesmo produto.
- Todos os parâmetros do link antigo são mantidos no redirecionamento (`?ref=`, `utm_*` e quaisquer outros).
- Âncoras da página (`#venda-futura`, `#compra-coletiva`) continuam levando à seção certa.

**Edge cases:**
- Link antigo de produto que não existe mais → página de não encontrado.
- Banco indisponível no momento do redirecionamento → a página ainda leva ao link novo, mas sem o redirect permanente *(comportamento de contingência)*.

## 4. Fluxo de Negócio

```
Visitante abre /produto/<x>
   │
   ▼
<x> começa com UUID? (link antigo)
   ├── sim ──▶ Produto existe? ──┬── sim ──▶ Redireciona permanente para /produto/<slug>?<mesmos parâmetros>
   │                             └── não ──▶ Não encontrado
   └── não ──▶ Existe produto com esse slug, aprovado e com preço?
                  ├── sim ──▶ Página do produto (canônico = /produto/<slug>)
                  └── não ──▶ Não encontrado
```

## 5. Critérios de Aceite

### 5a. Critérios de aceite da feature

| Critério | Razão de negócio | Como verificar (observável) |
|----------|------------------|-----------------------------|
| `/produto/broa-de-milho` abre a Broa de Milho com canônico igual ao próprio link | Link legível e sem conteúdo duplicado no Google | Abrir o link; conferir o `<link rel="canonical">` |
| Link antigo responde redirect permanente (308) para o slug | O Google transfere a relevância; link impresso não quebra | `curl -I /produto/1ef6f6db-7d3a-4a2e-a67d-e8efec3250a5` → 308, `location: /produto/broa-de-milho` |
| `?ref=` e `utm_*` sobrevivem ao redirecionamento | Sem isso o afiliado perde comissão e a campanha perde atribuição | `curl -I "/produto/<uuid>?ref=abc&utm_source=meta"` → `location` com os dois parâmetros |
| Nenhum produto sem link e nenhum link repetido | Link único é a identidade do produto | Contagem no banco: total = com slug = slugs distintos |
| Vitrines, busca, sitemap e feed não emitem link com UUID nem `/produto/undefined` | Link novo em todo ponto público | Varredura do HTML de categoria, loja, coletiva, sitemap e feed |
| Renomear produto não muda o link | Link divulgado não quebra | Renomear no painel e abrir o link antigo |
| Produto novo com nome repetido recebe `-2` | Cadastro nunca trava por nome | Criar produto com nome existente e conferir o link |

### 5b. Métricas de sucesso

| Métrica | Baseline (fonte) | Meta | Prazo | Mín. aceitável | Responsável |
|---------|-------------------|------|-------|-----------------|-------------|
| URLs de produto indexadas no formato novo | 0 (Search Console, 29/09) | 100% das URLs de produto indexadas | 30 dias após o deploy *(premissa)* | 80% *(premissa)* | Dona do produto |
| Links antigos com erro 404 no Search Console | A levantar (relatório Páginas, a partir de 01/10) | 0 | 30 dias | 0 | Dona do produto |
| CTR orgânico das páginas de produto | A levantar (Search Console → Desempenho, primeiros 28 dias) | +10% *(premissa)* | 60 dias | Sem queda | Dona do produto |

## 6. Milestones

### Milestone 1: Publicar link amigável de produto

**Por que é um marco:** todo produto passa a ter um link legível e compartilhável, e nenhum link já divulgado quebra; é a conquista inteira da feature, anunciável para sellers e afiliados.

**Funcionalidades:** US01, US02, US03, US04

**Checklist de aceite** (marcado pelo Aprovador após a implementação):
- [ ] `/produto/broa-de-milho` abre com canônico igual ao próprio link
- [ ] Link antigo responde 308 para o slug, com `?ref=` e `utm_*` preservados
- [ ] Banco: total = com slug = slugs distintos
- [ ] Vitrines, busca, sitemap e feed sem UUID e sem `/produto/undefined`
- [ ] Renomear produto não altera o link
- [ ] Produto novo com nome repetido recebe `-2`

**Aprovador:** dona do produto (industria24hs@gmail.com)

## 7. Riscos e Dependências

| Risco | Impacto | Mitigação | Status |
|-------|---------|-----------|--------|
| Queda temporária de posição no Google durante a troca de URL | Médio | Redirect permanente, canônico e sitemap novo; reenviar o sitemap no Search Console após o deploy | Monitorando |
| Nome repetido gera links com número pouco claros (`cafe-...-12`) | Baixo | Aceito na decisão 3; revisar se sellers reclamarem | Monitorando |
| Link fixo fica desalinhado com o nome após renomeação | Baixo | Aceito na decisão 2; a página sempre mostra o nome atual | Mitigado |

**Dependências:**

| Dependência | Tipo | Status | Impacto se bloqueado |
|-------------|------|--------|----------------------|
| Merge do PR #833 (renumeração da migration) | Interna | Aguardando merge | CI do repositório barrado; Milestone 1 não pode ir a produção |
| Deploy de produção pela CLI | Interna | Pendente | Milestone 1 |

## 8. Referências

- [PR #832](https://github.com/Schneider-Gr/industria24hIA/pull/832) — implementação do link `/produto/<slug>`
- [PR #833](https://github.com/Schneider-Gr/industria24hIA/pull/833) — renumeração da migration para 0208
- [PR #821](https://github.com/Schneider-Gr/industria24hIA/pull/821) — SEO técnico (noindex, robots, sitemap)
- `supabase/migrations/0208_slug_produto.sql` — regra de geração e unicidade do link
- `src/proxy.ts` — redirect permanente do link antigo

## 9. Registro de Decisões

- **2026-09-29:** Opção "só o nome no link" escolhida em vez de "nome + código curto". Motivo: decisão da dona do produto pela legibilidade, aceitando custo maior (coluna nova, regra de nome repetido).
- **2026-09-29:** Link fixo desde a criação. Motivo: afiliados, QR codes e Google não podem ter link quebrado; alternativa de guardar histórico de links antigos foi descartada por custo sem ganho claro.
- **2026-09-29:** Redirect permanente feito antes de a página carregar. Motivo: feito dentro da página, ele chegava ao Google como atualização da página (status 200), sem transferir relevância.
- **2026-09-29:** Implementação precedeu o PRD: este documento registra a regra de negócio já entregue no #832 (migration aplicada em produção em 29/09). `depends_on` vazio: nenhum PRD existente especifica comportamento que esta feature pressupõe.
