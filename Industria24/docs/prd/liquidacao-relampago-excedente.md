# PRD - Liquidacao relampago de excedente de estoque

> Exportado do Confluence (espaco IND24H, page id 1277953) em 09/07/2026.

### Product overview

| Target date | A definir |
|---|---|
| Document status | DRAFT |
| Team members | Andreia Schneider |

### Objective

Criar uma janela de tempo curta (24-48h) com desconto agressivo para o fabricante escoar estoque parado ou proximo do vencimento, gerando urgencia de compra e evitando perda de producao perecivel.

### Problem statement

Diferente do desconto progressivo por lote (MPDD-24, baseado em quantidade), o problema aqui e tempo: produtos perecives (ja confirmados no catalogo, ex: hortifruti) ou estoque parado de qualquer categoria perdem valor se nao vendidos rapido. Hoje nao ha mecanismo de venda relampago.

### Success metrics

| Goal | Metric |
|---|---|
| Reducao de perda de estoque | % de estoque proximo do vencimento escoado via liquidacao |
| Urgencia de compra | Taxa de conversao de banners de liquidacao vs vitrine normal |
| Frequencia de uso pelo fabricante | Numero de liquidacoes criadas por mes |

### Requirements

| Requirement | Importance |
|---|---|
| Fabricante marca um produto/lote como liquidacao com desconto e prazo | HIGH |
| Vitrine destaca liquidacoes ativas com contagem regressiva | HIGH |
| Notificacao aos compradores interessados na categoria (reaproveita MPDD-14 WhatsApp) | MEDIUM |

### Out of Scope

Leilao de preco decrescente automatico (v1 e desconto fixo definido pelo fabricante, nao dinamico).

### Proposed solution

Tela simples no painel do fabricante para marcar um produto como liquidacao (desconto %, prazo). Vitrine ganha secao 'Liquidacao Relampago' com contagem regressiva. Reaproveita o Centro de Distribuicao (MPDD-31) para excedente que esta fisicamente no CD.

### Ideia relacionada no Jira Product Discovery

Ver MPDD-35 no board de descoberta.

> Card ao vivo do Jira (ver na origem): https://andreiasworkspace-14440074.atlassian.net/issues/?jql=text%20~%20%22MPDD-35*%22%20or%20summary%20~%20%22MPDD-35*%22%20or%20key%20%3D%20MPDD-35%20ORDER%20BY%20created%20DESC
