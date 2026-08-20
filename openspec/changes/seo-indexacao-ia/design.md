## Google Search Console — passo a passo

1. Acesse https://search.google.com/search-console com a conta Google que
   administra o domínio (ou que tem acesso ao DNS de `industria24.com.br`).
2. Escolha o tipo de propriedade **Domínio** (não "Prefixo de URL") — cobre
   `http://`, `https://`, `www.` e subdomínios em uma verificação só.
3. Digite `industria24.com.br` e confirme.
4. O Search Console mostra um registro **TXT** para adicionar no DNS
   (`google-site-verification=...`). Cadastre esse TXT no provedor de DNS do
   domínio (mesmo lugar onde estão os registros A/CNAME da Vercel) e aguarde
   propagação (minutos a poucas horas).
5. Clique em "Verificar" no Search Console. Se o domínio não estiver na
   Vercel diretamente (DNS gerenciado em outro provedor), confirme qual
   painel tem esse acesso antes de tentar — verificação errada em domínio
   errado é o erro mais comum aqui.
6. Após verificado, vá em **Sitemaps** (menu lateral) e envie
   `sitemap.xml` (o Search Console completa a URL base sozinho — basta
   digitar `sitemap.xml`). Isso usa o `src/app/sitemap.ts` desta mudança.
7. Em **Configurações → Rastreamento**, opcionalmente peça indexação
   manual das páginas mais importantes (home, `/coletivas`, `/leilao`) via
   **Inspeção de URL** para acelerar a primeira descoberta.
8. Alertas de cobertura ("Página não indexada", erros 404/soft-404) aparecem
   em **Páginas** dias depois — não é instantâneo; revisar semanalmente no
   primeiro mês.

## Palavras-chave do segmento (marketplace industrial B2B, Manaus/AM)

Ponto de partida com base no domínio do produto (proposta de valor: compra
direta da indústria, sem atravessador, entrega rápida em Manaus). Validar
com Google Keyword Planner (Google Ads → Ferramentas → Planejador de
palavras-chave → "Descubra novas palavras-chave", não exige campanha ativa)
antes de tratar volume/CPC como fato — os números abaixo são hipótese de
segmento, não dado de ferramenta.

**Alta intenção comercial (comprador B2B):**
- marketplace industrial Manaus
- compra direto da indústria Manaus
- atacado industrial Manaus AM
- insumos industriais Manaus
- distribuidor industrial Manaus
- preço de fábrica materiais industriais
- compra coletiva industrial

**Cauda longa / long-tail (produto específico + local):**
- "[categoria de produto] Manaus atacado"
- "[categoria de produto] direto da fábrica"
- entrega rápida material industrial Manaus

**Lado oferta (fornecedor/parceiro):**
- vender online indústria Manaus
- marketplace para fornecedor industrial
- afiliado marketplace industrial
- parceiro logístico entregas Manaus

### Onde distribuir

| Página | H1 sugerido | Onde entram as secundárias |
|---|---|---|
| Home (`/`) | já tem copy institucional (ver `layout.tsx` DESCRICAO) | H2 dos blocos de categoria/destaque — usar nome real da categoria, não termo genérico |
| `/categoria/[id]` (metadata desta mudança) | nome real da categoria | description já gerada por `generateMetadata` |
| `/compra-coletiva` | já tem metadata fixo | considerar reforçar "compra coletiva industrial" no H1 atual |
| `/seja-fornecedor` | já tem metadata fixo | H2 pode citar "vender online indústria Manaus" |
| `/vender-como-afiliado` | já tem metadata fixo | H2 pode citar "afiliado marketplace industrial" |
| `/seja-parceiro` | já tem metadata fixo | H2 pode citar "parceiro logístico entregas Manaus" |

Não editar copy visível das páginas institucionais nesta mudança sem
confirmação — a lista acima é insumo para o dono do produto decidir, não
uma reescrita automática (ver tasks.md 4.2).

## Estado real de Search Console / Google Ads nesta sessão

Checado ao vivo em 2026-08-19 na aba logada com `industria24hs@gmail.com`,
sem bloqueio de login/MFA.

- **Search Console**: a única propriedade verificada nessa conta é
  `sc-domain:industria24h.com.br` — **o domínio legado, com "h", do Bubble
  antigo** (ver distinção em `CLAUDE.md` da raiz do repo: os dois domínios
  não são intercambiáveis). Métricas dessa propriedade: 189 cliques totais,
  3 páginas indexadas contra 38 não indexadas. Dois sitemaps enviados em
  17/10/2023, ambos quebrados (`sitemap.txt` — "não foi possível buscar";
  `/` — "1 erro"). **O domínio real do projeto, `industria24.com.br` (sem
  h), não tem propriedade cadastrada nessa conta** — o GSC recusa acesso
  ("Ops, você não tem acesso a esta propriedade") ao tentar abri-lo.
  Conclusão: não há nada para migrar da propriedade legada — ela é de outro
  site. O passo a passo da seção acima (cadastro do zero, tipo Domínio,
  verificação TXT) vale integralmente e é o próximo passo real, não
  formalidade.
- **Google Ads**: essa conta Google nunca configurou o Ads — `ads.google.com`
  redireciona para a landing de onboarding de "novo anunciante"
  (`business.google.com/br/google-ads`). Nenhuma campanha existe. Fica como
  decisão em aberto do dono do produto se a criação de conta/campanha Ads
  entra no escopo desta mudança (ela é paga e teria impacto orçamentário —
  não deve ser criada sem confirmação explícita).

## Google Merchant Center — plano de implementação

Merchant Center serve dois propósitos aqui, em ordem de prioridade:
(1) listagem gratuita de produtos no Google Shopping/Search (não exige Ads),
que é ganho de SEO/tráfego direto; (2) pré-requisito bloqueante do PRD 008
(`google-ucp-integration`, waitlist do Google UCP) — sem Merchant Center com
feed configurado, a integração de checkout agêntico (AI Mode/Gemini) nem
entra na fila de aprovação (ver `industria24h-ucp-waitlist-bloqueada-2026-08-03`
na memória do projeto). Este plano cobre só (1) e a preparação de schema
para (2); a integração UCP em si é escopo do PRD 008, não desta mudança.

### Gap de schema confirmado (leitura de `database.types.ts`, não suposição)

A tabela `produtos` **não tem** `marca`/`brand` nem `gtin`/`mpn`. Atributos
obrigatórios do feed do Merchant Center para a maioria das categorias
(`brand` + `gtin` OU `identifier_exists: false`) não têm de onde vir hoje.
Duas opções, sem inventar coluna sem confirmação:

1. **Rápido, sem migration**: usar `identifier_exists: false` no feed para
   todo item (o Google aceita produtos "sem identificador único" com
   restrições — cobertura de exibição menor, mas funciona). Suficiente para
   destravar a listagem gratuita.
2. **Correto a médio prazo**: adicionar `marca` (e opcionalmente `gtin`) em
   `produtos`, preenchido pelo seller no cadastro — decisão de produto, não
   técnica; **não criar migration para isso nesta mudança sem o usuário
   confirmar o campo**.

Recomendação: seguir com (1) agora, revisitar (2) se o volume de produtos
sem marca/GTIN afetar a performance da listagem.

### Passo a passo — conta e feed

1. **Criar conta no Merchant Center** (https://merchants.google.com) com
   `industria24hs@gmail.com`, vinculada ao domínio `industria24.com.br`
   já verificado no Search Console (passo anterior é pré-requisito — GSC e
   Merchant Center compartilham verificação de domínio).
2. **Configurar informações da empresa**: país de venda BR, moeda BRL,
   endereço/CNPJ da Indústria 24h.
3. **Frete**: configurar como regra de frete no Merchant Center (a
   plataforma já calcula frete real por CEP/loja — ver `src/lib/cep.ts` —
   mas o Merchant Center precisa de uma regra própria, geralmente uma
   estimativa por região/frete grátis acima de valor mínimo; não há como
   mapear 1:1 o cálculo dinâmico de frete do checkout para o feed estático).
4. **Política de devolução**: cadastrar a política já publicada em
   `/termos/[slug]` (confirmar qual termo cobre trocas/devolução antes de
   linkar — se não existir, é bloqueio a resolver antes do feed, não
   suposição a preencher).
5. **Feed de produtos** (já implementado nesta mudança):
   `src/app/feed-produtos.xml/route.ts`
   (Route Handler, não página) gerando XML no formato RSS 2.0 do Google
   Shopping a partir de `produtos` (`status_produto = "Aprovado"`, join com
   `produto_imagens` ordenado por `ordem`, `lojas_vitrine` para nome da
   loja). Campos por item: `g:id` (produto.id), `g:title` (nome),
   `g:description` (descrição limpa de BBCode), `g:link`
   (`/produto/{id}`), `g:image_link` (primeira imagem por `ordem`),
   `g:availability` (`in stock` se `estoque_atual > 0`, senão
   `out of stock`), `g:price` (`valor BRL`), `g:condition` (`new`),
   `g:identifier_exists` (`false`, ver gap de schema acima),
   `g:google_product_category` (mapeamento manual categoria→taxonomia
   Google — não existe hoje, ver task 6.5).
6. **Registrar o feed** em Merchant Center → Produtos → Feeds → apontar
   para `https://industria24.com.br/feed-produtos.xml`, agendamento
   automático diário (o Route Handler já reflete o Supabase em tempo real
   a cada fetch, então "diário" é o Google, não uma limitação nossa).
7. **Diagnóstico**: Merchant Center sinaliza itens rejeitados (preço
   divergente da página, imagem inválida, categoria faltando) em
   Produtos → Diagnóstico — checar nos primeiros dias após o primeiro
   crawl do feed.
8. **Listagem gratuita** (Surfaces across Google) é habilitada por padrão
   para contas novas no Brasil; confirmar em Configurações → Programas
   de listagem gratuita que está ativo antes de considerar a etapa concluída.

### Estado real do Merchant Center nesta sessão

Checado ao vivo em 2026-08-19 na aba logada com `industria24hs@gmail.com`,
sem bloqueio de login/MFA.

- **A conta já existe** — ID `5292116654` — abriu direto em
  `merchants.google.com` sem pedir criação. Task 6.3 (criar conta) vira
  "confirmar domínio vinculado", não criação do zero.
- **0 produtos** cadastrados (Aprovado/Limitado/Reprovado/Em análise todos
  zerados) — nenhum feed foi configurado ainda.
- **49 cliques nos últimos 28 dias, custo R$ 0,00** — sinal de que já
  existiu alguma listagem/campanha no passado (orgânica ou paga) mesmo com
  0 produtos ativos hoje; vale investigar a origem antes de configurar do
  zero, para não duplicar ou conflitar com algo esquecido.
- **"Qualidade da loja" indisponível** e sugestões pendentes na Visão Geral
  não atendidas: "Adicionar produtos", "Vincular Perfil da Empresa ao
  Gerenciador de empresa", "Ativar melhorias automáticas de imagem",
  "Google Avaliações do Consumidor".
- **Não confirmado nesta checagem**: domínio vinculado à conta, e
  configuração de frete/devolução — as rotas diretas
  (`/mc/businessinformation`, `/mc/settings/shipping`) redirecionam de
  volta para `/mc/overview` (a navegação por URL direta não funciona nessa
  SPA; precisa ser via clique no menu lateral). **Confirmar manualmente
  antes da task 5.3** se o domínio vinculado é `industria24.com.br` — se
  for outra propriedade (ex.: o domínio legado com "h", pelo padrão já visto
  no Search Console), o plano muda.

### Não incluído neste plano

- Campanhas pagas do Shopping (Performance Max) — depende de Google Ads
  existir, que não existe hoje (ver seção anterior); decisão em aberto do
  dono do produto.
- Integração UCP completa (perfil `/.well-known/ucp`, checkout nativo,
  Identity Linking, webhooks de pedido) — é o PRD 008, com escopo, riscos
  (Pix/boleto sem caminho documentado no UCP) e skill próprios; este plano
  só destrava o pré-requisito de Merchant Center.
