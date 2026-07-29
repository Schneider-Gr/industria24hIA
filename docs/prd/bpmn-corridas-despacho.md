# PRD — Corridas / Despacho

## Problema
Toda entrega gerada por um pedido pago precisa virar uma "corrida" rastreável, roteada a um parceiro logístico disponível, com estados claros até a liquidação.

## Escopo
Rotas `/corridas` (lista/fila) e `/corridas/nova` (criação — manual ou disparada automaticamente pelo checkout).

## Ciclo de vida (estados)
```
criada
  → buscando_parceiro
    → aguardando_aceite (parceiro notificado, timer de aceite)
      → aceita → em_transporte → entregue → liquidada
      → recusada / timeout → volta para buscando_parceiro (próximo candidato)
    → sem_parceiro_disponivel (esgotou pool do afiliado + pool geral) → escalada manual
  → cancelada (a qualquer momento antes de em_transporte, se pedido for cancelado)
```

## Regras de negócio
1. Matching: primeiro tenta parceiros do afiliado logístico da região do seller/pedido; se nenhum aceitar em N minutos (configurável), cai no pool geral.
   - `ponytail: fila FIFO por proximidade simples na v1; evoluir para leilão/score quando volume justificar.`
2. Cada corrida carrega: `pedido_id`, `afiliado_logistica_id` (nullable), `parceiro_logistico_id` (nullable até aceite), `valor_frete_base`, `comissao_afiliado_pct`, `valor_repasse_parceiro`, `status`, timestamps por transição de estado.
3. Cancelamento de pedido antes de `em_transporte` cancela a corrida sem custo. Depois disso, requer fluxo de estorno manual (fora de escopo v1).
4. Liquidação (`entregue` → `liquidada`): dispara repasse PIX ao parceiro e credita comissão ao afiliado, batch diário ou por evento (decisão de implementação, não de produto).

## Métricas de sucesso
- Tempo médio `criada` → `aceita`.
- % de corridas que caem em `sem_parceiro_disponivel`.
- Taxa de cancelamento pós-aceite.

## Dependências
- PRD Afiliado Logística, PRD Parceiro Logístico.
- PRD Checkout — Cálculo de Frete (fonte do `valor_frete_base` e `comissao_afiliado_pct`).
- BPMN `corrida-entrega.bpmn` (ver arquivo em anexo) modela este ciclo de vida como processo executável.
