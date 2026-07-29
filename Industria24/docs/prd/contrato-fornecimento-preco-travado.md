# PRD - Contrato de fornecimento com preco travado

> Exportado do Confluence (espaco IND24H, page id 1212417) em 09/07/2026.

### Product overview

| Target date | A definir |
|---|---|
| Document status | DRAFT |
| Team members | Andreia Schneider |

### Objective

Permitir que um comprador industrial trave o preco de um insumo por um periodo (3 a 6 meses), com entregas parceladas, protegendo-se de alta de mercado. Industria24h cobra taxa de servico sobre o contrato.

### Problem statement

A Venda Futura (MPDD-23) resolve reserva pontual de um lote numa data. Compradores de maior volume querem previsibilidade de preco por um periodo mais longo, com entregas recorrentes, e hoje nao ha esse mecanismo.

### Success metrics

| Goal | Metric |
|---|---|
| Receita recorrente de servico | Receita de taxas sobre contratos ativos |
| Fidelizacao de grandes compradores | Numero de contratos renovados |
| Ticket medio | Valor medio comprometido por contrato |

### Requirements

| Requirement | Importance |
|---|---|
| Comprador negocia preco e periodo com o fabricante (ou fabricante publica oferta de contrato) | HIGH |
| Sistema gera entregas parceladas automaticas no periodo | HIGH |
| Cobranca automatica por entrega (Asaas assinatura, ver MPDD-17) | MEDIUM |
| Clausula de cancelamento e penalidade | MEDIUM |

### Out of Scope

Hedge financeiro complexo (derivativos); contratos com mais de 1 fabricante simultaneo na v1.

### Proposed solution

Reaproveita a infraestrutura de assinatura/recorrencia nativa do Asaas (MPDD-17) para as entregas parceladas, e a logica de reserva ja existente na Venda Futura (MPDD-23). Fabricante define quantidade maxima disponivel para contrato por periodo.

### Ideia relacionada no Jira Product Discovery

Ver MPDD-33 no board de descoberta.

> Card ao vivo do Jira (ver na origem): https://andreiasworkspace-14440074.atlassian.net/issues/?jql=text%20~%20%22MPDD-33*%22%20or%20summary%20~%20%22MPDD-33*%22%20or%20key%20%3D%20MPDD-33%20ORDER%20BY%20created%20DESC
