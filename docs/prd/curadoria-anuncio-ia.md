# PRD - Curadoria de anuncio por IA (score de qualidade)

> Exportado do Confluence (espaco IND24H, page id 688130) em 09/07/2026.

### Product overview

| Target date | A definir |
|---|---|
| Document status | DRAFT |
| Team members | Andreia Schneider |

### Objective

Dar ao vendedor um score de qualidade do anuncio (0-100) com recomendacoes acionaveis geradas por IA, elevando a taxa de conversao e reduzindo devolucoes/duvidas causadas por anuncios incompletos ou mal descritos, sem exigir que o vendedor saiba o que 'bom anuncio' significa.

### Problem statement

Hoje o cadastro de produto no Industria24h nao da feedback de qualidade ao vendedor. Anuncios com descricao vazia, fotos ruins ou ficha tecnica incompleta convivem lado a lado com anuncios completos, sem diferenciacao de score ou orientacao de melhoria — o vendedor so descobre que o anuncio e fraco quando ja perdeu vendas.

### Engenharia reversa: Mercado Livre 'Qualidade do anuncio'

Feita em 09/07/2026, navegando ao vivo o editor de anuncio do Mercado Livre (conta logada, anuncio MLB4711601785). O ML exibe um gauge de score (observado: 84/100, rotulo 'Qualidade do anuncio') com um checklist de 7 objetivos organizados em 2 grupos:

Grupo 'Dados do produto' (5 itens): características/ficha tecnica completas (reduz perguntas e devolucoes); titulo otimizado (usa recomendacao automatica); qualidade/quantidade de fotos (mais visitas); tempo de disponibilidade do anuncio (evita anuncio 'parado' sem atualizacao); codigo universal do produto / GTIN-EAN (evita perder exposicao em buscas por codigo).

Grupo 'Opcao de venda' (2 itens): frete gratis oferecido; parcelamento sem juros oferecido.

Cada item mostra check verde quando alcancado, ou um card com o texto exato da acao recomendada quando pendente. O score e transparente (nao caixa-preta) — o vendedor ve exatamente qual objetivo falta e por que. E um sistema baseado em regras/checklist, nao em IA generativa: verifica presenca/ausencia de campos e configuracoes, nao avalia a qualidade real do conteudo (ex: nao le se a descricao faz sentido, nao avalia se a foto e nitida).

### Success metrics

| Metrica | Meta |
|---|---|
| Score medio de qualidade dos anuncios ativos | A definir apos baseline |
| % de anuncios com score acima de 80 | A definir |
| Uplift de conversao em anuncios com score alto vs baixo | Medir no piloto |
| Reducao de perguntas/devolucoes em anuncios com ficha tecnica completa | A medir |

### Requirements

| Requisito | Descricao | Prioridade |
|---|---|---|
| Score de qualidade (0-100) | Exibido no cadastro do produto e na lista de produtos do vendedor | Alta |
| Checklist de objetivos por regra | Ficha tecnica completa, titulo com palavras-chave, quantidade de fotos, frete gratis, parcelamento — replicando o modelo ML como base | Alta |
| Curadoria por IA da descricao | LLM avalia clareza/completude do texto e sugere reescrita, nao so verifica se existe | Alta |
| Curadoria por IA das fotos | Modelo de visao avalia nitidez, enquadramento, fundo, se mostra o produto real | Media |
| Sugestao de ficha tecnica ausente | IA sugere valores com base na categoria e em produtos similares ja cadastrados | Media |
| Alerta de compliance | Sinaliza titulo/descricao com informacao potencialmente enganosa ou incompleta | Media |
| CTA direto por objetivo pendente | Cada recomendacao leva direto ao campo a corrigir | Alta |
| Incentivo por score alto | Desconto na taxa de impulsionamento (MPDD-37) ou prioridade organica na vitrine para anuncios com score alto | Baixa |

### Out of Scope

- Geracao automatica de fotos ou descricao do zero (isso e MPDD-20, cadastro assistido por IA — este modulo avalia e recomenda, MPDD-20 gera).
- Score de reputacao do vendedor (metrica separada, nao e sobre o anuncio individual).
- Leilao ou priorizacao paga isolada da qualidade (isso e MPDD-37).

### Proposed solution

Fase 1 (paridade com ML): implementar o checklist baseado em regras, replicando os 7 objetivos observados na engenharia reversa — verificacao de presenca/ausencia de campos (ficha tecnica, fotos, titulo com min. de caracteres/palavras-chave, frete gratis, parcelamento). Score simples = % de objetivos alcancados.

Fase 2 (diferencial por IA): ir alem do checklist estatico, usando LLM multimodal para avaliar a QUALIDADE do conteudo, nao so sua presenca — reescrever descricoes fracas, avaliar nitidez/enquadramento de fotos, sugerir preenchimento de ficha tecnica ausente com base em produtos similares da categoria, e alertar sobre informacao enganosa. Essa e a diferenciacao real frente ao modelo do ML, que e checklist puro sem avaliar qualidade de conteudo.

Fase 3 (incentivo): conectar o score de qualidade a beneficios tangiveis — desconto na taxa de impulsionamento (MPDD-37) ou prioridade organica na vitrine/busca — para que o vendedor tenha motivo financeiro direto para manter o anuncio completo, nao so uma metrica de vaidade.

Ideia relacionada: MPDD-44. Correlaciona com MPDD-20 (cadastro assistido por IA) e MPDD-37 (impulsionamento pago).

> Card ao vivo do Jira (ver na origem): https://andreiasworkspace-14440074.atlassian.net/issues/?jql=text ~ "MPDD-44*" or summary ~ "MPDD-44*" or key = MPDD-44 ORDER BY created DESC
