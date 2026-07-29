# PRD - Antecipacao de recebiveis para fabricantes

> Exportado do Confluence (espaco IND24H, page id 1245185) em 09/07/2026.

### Product overview

| Target date | A definir |
|---|---|
| Document status | DRAFT |
| Team members | Andreia Schneider |

### Objective

Oferecer ao fabricante a opcao de antecipar o valor de vendas ja confirmadas (incluindo reservas de Venda Futura) mediante uma taxa, resolvendo o problema de capital de giro do pequeno fabricante e criando uma nova linha de receita financeira para a plataforma.

### Problem statement

Fabricantes pequenos tem fluxo de caixa apertado e a Venda Futura (MPDD-23) piora isso no curto prazo: o dinheiro so entra na entrega, mesmo que a venda ja esteja garantida. Sem antecipacao, isso desincentiva o fabricante a oferecer producao futura.

### Success metrics

| Goal | Metric |
|---|---|
| Adesao de fabricantes | % de fabricantes que usam antecipacao |
| Receita de taxa | Receita mensal de taxas de antecipacao |
| Aumento de oferta em Venda Futura | Volume ofertado em Mercado Futuro apos lancar antecipacao |

### Requirements

| Requirement | Importance |
|---|---|
| Fabricante solicita antecipacao de um pedido/reserva confirmada | HIGH |
| Integracao com a funcionalidade nativa de antecipacao de recebiveis do Asaas (confirmada em docs.asaas.com) | HIGH |
| Taxa de antecipacao configuravel | MEDIUM |
| Painel do fabricante mostra valor disponivel para antecipar | MEDIUM |

### Out of Scope

Concessao de credito proprio sem lastro em recebivel real (isto e so antecipacao de venda ja confirmada, nao emprestimo).

### Proposed solution

Usar a API nativa de antecipacao de recebiveis do Asaas em vez de construir motor financeiro proprio - Industria24h so precisa expor a opcao no painel do fabricante e repassar a chamada. Baixo esforco de engenharia, alto valor de retencao de fabricante.

### Ideia relacionada no Jira Product Discovery

Ver MPDD-34 no board de descoberta.

> Card ao vivo do Jira (ver na origem): https://andreiasworkspace-14440074.atlassian.net/issues/?jql=text%20~%20%22MPDD-34*%22%20or%20summary%20~%20%22MPDD-34*%22%20or%20key%20%3D%20MPDD-34%20ORDER%20BY%20created%20DESC
