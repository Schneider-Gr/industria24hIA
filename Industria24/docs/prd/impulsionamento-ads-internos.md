# PRD - Impulsionamento pago de produtos (ads internos)

> Exportado do Confluence (espaco IND24H, page id 1343489) em 09/07/2026.

### Product overview

| Target date | A definir |
|---|---|
| Document status | DRAFT |
| Team members | Andreia Schneider |

### Objective

Dar ao seller um botao 'Impulsionar' dentro do proprio anuncio, com custo previsivel (percentual fixo calculado por categoria) descontado automaticamente do recebivel, criando uma segunda fonte de receita para a plataforma alem da comissao de venda, sem exigir do seller sofisticacao de gestor de trafego.

### Problem statement

Hoje a unica receita da plataforma e comissao sobre venda efetivada. Isso limita a receita ao volume transacionado e nao aproveita a intencao de sellers de ganhar visibilidade extra para produtos novos ou pouco conhecidos. Um leilao de CPC como Mercado Ads/Amazon Sponsored Products (modelo real do mercado) e complexo demais para o publico inicial de sellers do Industria24h — precisa de um ponto de entrada mais simples.

### Benchmark de mercado (pesquisado 09/07/2026)

Mercado Ads (Product Ads): cobranca por CLIQUE (CPC) em leilao de segundo preco — o anunciante paga o minimo necessario para superar o concorrente imediatamente abaixo no ranking. A cobranca do mes acumulado só é faturada no mes seguinte, separada da comissao estrutural de venda (11-14% Classico, 16-19% Premium, variando por categoria, mais custo fixo de R$5,50-6,50 por unidade abaixo de R$79).

Amazon Sponsored Products: tambem CPC, media de US$0,80-1,25 por clique em 2026 (alta de 8-12% vs 2025). O seller define orcamento diario; o CPC varia fortemente por categoria — categorias de ticket alto tem leiloes mais caros e mais concorridos.

Diferenca do modelo proposto aqui: nenhum dos dois usa percentual fixo por categoria descontado do recebivel — ambos usam leilao de clique, que exige volume de sellers concorrendo pela mesma busca/categoria para funcionar bem e exige integracao de billing mais complexa (orcamento diario, faturamento mensal separado). Para o estagio atual do Industria24h, um percentual fixo e mais simples de construir, entender e vender para sellers pequenos — e evolui para leilao de CPC (fase 2) quando houver massa critica de sellers disputando destaque na mesma categoria.

### Success metrics

| Metrica | Meta |
|---|---|
| Receita mensal de impulsionamento | A definir apos piloto |
| % de sellers ativos que usam o Impulsionar ao menos 1x/mes | A definir |
| Uplift de conversao em produtos impulsionados vs nao impulsionados | Medir baseline no piloto |
| Inadimplencia por desconto no recebivel (deve ser ~0, e automatico) | 0% |

### Requirements

| Requisito | Descricao | Prioridade |
|---|---|---|
| Botao Impulsionar no anuncio | Visivel na tela de gestao de produtos do seller | Alta |
| Tabela de percentual por categoria | Configuravel pelo admin (ex: eletronicos 3%, hortifruti 1.5%) | Alta |
| Selecao de periodo | 7 / 15 / 30 dias de impulsionamento | Alta |
| Destaque na vitrine/categoria/busca | Selo visual + posicao priorizada durante o periodo ativo | Alta |
| Calculo automatico do valor devido | Percentual x GMV do produto no periodo, ou taxa fixa se nao vendeu | Alta |
| Desconto automatico no recebivel | Integrado ao split/repasse via Asaas, sem cobranca manual | Alta |
| Painel de performance do impulsionamento | Visualizacoes, cliques, conversoes atribuidas ao produto impulsionado | Media |
| Historico de campanhas do seller | Extrato de quanto foi gasto e o retorno por periodo | Media |

### Out of Scope

- Leilao de CPC / lance por clique (fica para fase 2, quando houver volume de concorrencia por categoria).
- Segmentacao avancada de publico ou remarketing.
- Anuncios fora da plataforma (redes sociais, Google Ads) — este modulo e so vitrine interna.

### Proposed solution

Fase 1 (MVP): o seller clica 'Impulsionar' no anuncio, escolhe o periodo (7/15/30 dias), o sistema mostra o percentual da categoria do produto (tabela configuravel pelo admin) e o seller confirma. O produto ganha selo/posicao de destaque na vitrine, categoria e busca durante o periodo. Ao fim do periodo (ou na proxima liquidacao), o valor calculado (percentual x GMV do produto vendido no periodo, ou taxa fixa se o produto nao vendeu) e descontado automaticamente do proximo repasse via Asaas — sem exigir cartao separado ou saldo pre-pago do seller.

Fase 2 (evolucao): quando houver massa critica de sellers concorrendo pela mesma categoria/busca, migrar para leilao de CPC nos moldes do Mercado Ads/Amazon Sponsored Products, capturando o valor de mercado real de cada posicao em vez de uma taxa fixa.

Ideia relacionada: MPDD-37.

> Card ao vivo do Jira (ver na origem): https://andreiasworkspace-14440074.atlassian.net/issues/?jql=text ~ "MPDD-37*" or summary ~ "MPDD-37*" or key = MPDD-37 ORDER BY created DESC
