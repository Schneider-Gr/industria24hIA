# PRD - Centro de Distribuicao / Fulfillment

> Exportado do Confluence (espaco IND24H, page id 1179649) em 09/07/2026.

### Product overview

| Target date | A definir |
|---|---|
| Document status | DRAFT |
| Team members | Andreia Schneider |

### Objective

Oferecer um servico de fulfillment (estoque gerenciado pela plataforma) para fabricantes pequenos, cobrando taxa de armazenagem/manuseio como nova fonte de receita recorrente, alem da comissao de venda.

### Problem statement

Fabricantes pequenos nao tem capacidade logistica propria, o que limita seu tempo de entrega e sua capacidade de atender pedidos grandes. O site ja tem os conceitos 'Cadastro Fulfillment' (Bubble) e 'Centro de distribuicao' (menu do rebuild), mas nenhum parece implementado de fato.

### Success metrics

| Goal | Metric |
|---|---|
| Nova fonte de receita | Receita mensal de taxas de armazenagem/manuseio |
| Tempo de entrega | Reducao do prazo medio de entrega para produtos em CD |
| Adesao de fabricantes pequenos | Numero de fabricantes usando fulfillment vs autologistica |

### Requirements

| Requirement | Importance |
|---|---|
| Cadastro de produto para fulfillment (fabricante envia estoque ao CD) | HIGH |
| Controle de estoque no CD, baixa automatica na venda | HIGH |
| Cobranca automatica de taxa de armazenagem (integrar Asaas) | MEDIUM |
| Selo de 'Entrega rapida' para produtos no CD | LOW |

### Out of Scope

Operacao fisica do(s) CD(s) (parceria logistica, nao construir armazem proprio); integracao com WMS complexo na v1.

### Proposed solution

V1 com 1 CD parceiro em Manaus. Fabricante cadastra produto para fulfillment, envia lote fisico, sistema controla estoque e baixa automatica no pedido. Cobranca de taxa via Asaas. Ligado a MPDD-35 (liquidacao de excedente) e MPDD-21 (afiliado de logistica, que pode fazer a coleta ate o CD).

### Ideia relacionada no Jira Product Discovery

Ver MPDD-31 no board de descoberta.

> Card ao vivo do Jira (ver na origem): https://andreiasworkspace-14440074.atlassian.net/issues/?jql=text%20~%20%22MPDD-31*%22%20or%20summary%20~%20%22MPDD-31*%22%20or%20key%20%3D%20MPDD-31%20ORDER%20BY%20created%20DESC
