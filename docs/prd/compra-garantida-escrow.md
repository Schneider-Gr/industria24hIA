# PRD - Compra Garantida (escrow com SLA de entrega)

> Exportado do Confluence (espaco IND24H, page id 6193153) em 23/07/2026. Ideia Jira: MPDD-45.

### Product overview

| Target date | A definir |
|---|---|
| Document status | DRAFT |
| Team members | Andreia Schneider |

Compra Garantida: o pagamento do comprador fica retido na plataforma (Asaas) e o repasse ao seller so e liberado apos confirmacao de entrega, expiracao do prazo de disputa ou decisao do admin. Selo de confianca exibido no anuncio e no checkout.

### Objective

Aumentar a conversao de compradores novos e o ticket medio, atacando a principal objecao do B2B online: medo de pagar e nao receber. Referencia: mecanismo central de confianca do Mercado Livre.

### Problem statement

Hoje o repasse e disparado pela confirmacao de pagamento (PR #43, migration 0058). O comprador nao tem protecao pos-venda no pedido comum; MPDD-28 cobre apenas pre-venda. O concorrente real da plataforma e a compra direta por WhatsApp/telefone da fabrica, sem nenhuma garantia.

### Success metrics

| Goal | Metric |
|---|---|
| Conversao de comprador novo | Baseline vs pos-selo |
| Saude das transacoes | % de pedidos com disputa aberta < 2% |
| Agilidade | Tempo medio de resolucao de disputa < 72h |
| Integridade financeira | Zero repasse liberado incorretamente (auditoria mensal) |

### Requirements

| Requirement | Importance |
|---|---|
| Novo estado do pedido: entrega_confirmada / prazo_disputa_expirado; campo liberar_em (entrega + N dias, default 7) | HIGH |
| Condicao no job de repasse PIX: so transfere apos estado de liberacao | HIGH |
| Gatilhos de confirmacao: comprador confirma no painel; despacho automatico (#25/#26/#29) marca entregue; prazo expira sem reclamacao | HIGH |
| Tabela de disputas + fila no painel admin com parecer obrigatorio (padrao curadoria #64/#69); decisoes: liberar, reembolsar (estorno Asaas), parcial | HIGH |
| Selo Compra Garantida no card do produto e no checkout | MEDIUM |
| Notificacoes nos estados retido/liberado/disputa (Resend; WhatsApp futuro MPDD-14) | MEDIUM |
| Testar DDL/DML em begin...rollback no banco linkado antes de aplicar (caminho do dinheiro) | HIGH |

### Out of scope

- Seguro/indenizacao alem do valor do pedido
- Arbitragem automatica por IA na v1
- Protecao para venda futura (usa o mesmo mecanismo depois, com liberacao por marco de producao)

### Proposed solution

1 migration (status + prazo + tabela de disputas), condicao no job de repasse existente, tela de confirmacao/disputa do comprador, fila de disputas no admin, selo na vitrine. O caminho do dinheiro nao muda, muda o quando: pagamento entra como hoje, repasse sai apenas com a condicao satisfeita.

Fluxo: checkout normal → pagamento entra na conta Asaas da plataforma → repasse fica pendente com `liberar_em` → gatilho de liberacao (confirmacao do comprador, entrega via despacho automatico, ou prazo expirado) → transferencia PIX pelo trilho existente. Disputa aberta dentro do prazo trava o repasse e cai na fila do admin.

Interacoes com o roadmap: MPDD-28 vira caso particular com prazo maior; venda futura usa liberacao parcelada por marco; a consolidacao de carga (MPDD-46) alimenta a confirmacao de entrega por parada.
