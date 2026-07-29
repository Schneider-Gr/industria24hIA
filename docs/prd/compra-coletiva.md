# PRD - Compra coletiva entre compradores pequenos

> Exportado do Confluence (espaco IND24H, page id 1310721) em 09/07/2026.

### Product overview

| Target date | A definir |
|---|---|
| Document status | DRAFT |
| Team members | Andreia Schneider |

### Objective

Permitir que varios compradores pequenos, que sozinhos nao atingem a quantidade minima do desconto progressivo (MPDD-24), se juntem numa compra coletiva para destravar o preco de lote, ampliando o publico que acessa desconto de volume.

### Problem statement

O desconto progressivo por lote (ja confirmado ao vivo no Bubble) beneficia quem compra muito. Compradores pequenos ficam de fora do beneficio mesmo que, somados, atingissem o volume - a plataforma perde vendas potenciais desses compradores menores.

### Success metrics

| Goal | Metric |
|---|---|
| Novos compradores atraidos | Numero de compradores que so compram via coletiva |
| Volume adicional destravado | Volume de pedidos fechados via compra coletiva |
| Taxa de sucesso das coletivas | % de coletivas que atingem a meta de volume antes do prazo |

### Requirements

| Requirement | Importance |
|---|---|
| Comprador inicia ou entra numa compra coletiva de um produto especifico | HIGH |
| Barra de progresso mostrando volume atual vs meta para destravar desconto | HIGH |
| Cobranca so efetivada se a meta for atingida ate o prazo (senao cancela) | HIGH |
| Notificacao de convite para outros compradores da regiao | MEDIUM |

### Out of Scope

Compra coletiva entre desconhecidos sem nenhuma curadoria (v1 pode limitar a mesma regiao/CEP para viabilizar frete conjunto).

### Proposed solution

Pagina de produto ganha opcao 'Comprar em grupo'. Sistema acumula pedidos ate atingir o volume da proxima faixa de desconto do MPDD-24 ou expira o prazo. Pagamento cobrado (ou reservado) por comprador individualmente.

### Ideia relacionada no Jira Product Discovery

Ver MPDD-36 no board de descoberta.

> Card ao vivo do Jira (ver na origem): https://andreiasworkspace-14440074.atlassian.net/issues/?jql=text%20~%20%22MPDD-36*%22%20or%20summary%20~%20%22MPDD-36*%22%20or%20key%20%3D%20MPDD-36%20ORDER%20BY%20created%20DESC
