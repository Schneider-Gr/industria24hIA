# PRD - Leilao reverso entre fabricantes

> Exportado do Confluence (espaco IND24H, page id 819202) em 09/07/2026.

### Product overview

| Target date | A definir |
|---|---|
| Document status | DRAFT |
| Team members | Andreia Schneider |

### Objective

Permitir que um comprador publique um pedido de volume e varios fabricantes concorrentes disputem com lances de preco/prazo, obtendo o melhor preco possivel e diferenciando a plataforma de um catalogo estatico.

### Problem statement

Hoje a Cotacao em Lote/RFQ (MPDD-8) e 1-para-1: comprador pede cotacao a um fabricante especifico. Compradores de grande volume querem comparar ofertas de varios fabricantes ao mesmo tempo, como em compras publicas/industriais tradicionais.

### Success metrics

| Goal | Metric |
|---|---|
| Melhor preco para compras grandes | Desconto medio obtido vs preco de tabela |
| Engajamento de fabricantes | Numero de lances por leilao |
| Ticket medio | Valor medio de pedidos fechados via leilao |

### Requirements

| Requirement | Importance |
|---|---|
| Comprador publica pedido (produto/categoria, volume, prazo desejado) | HIGH |
| Fabricantes elegiveis recebem notificacao e podem dar lance | HIGH |
| Janela de tempo do leilao com contagem regressiva | MEDIUM |
| Comprador escolhe o vencedor (nao e so o menor preco - prazo/reputacao contam) | MEDIUM |

### Out of Scope

Leilao automatico sem intervencao do comprador na escolha final; leilao para produtos de venda futura (ver MPDD-23, tratado separado).

### Proposed solution

Tela de 'pedido aberto' visivel aos fabricantes da categoria certa. Cada fabricante envia proposta (preco, prazo, condicoes). Comprador compara e escolhe. Reaproveita cadastro de fabricante e categoria ja existentes.

### Ideia relacionada no Jira Product Discovery

Ver MPDD-32 no board de descoberta.

> Card ao vivo do Jira (ver na origem): https://andreiasworkspace-14440074.atlassian.net/issues/?jql=text%20~%20%22MPDD-32*%22%20or%20summary%20~%20%22MPDD-32*%22%20or%20key%20%3D%20MPDD-32%20ORDER%20BY%20created%20DESC
