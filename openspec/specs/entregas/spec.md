# Entregas / Logística Specification

## Purpose
Despacho e execução de entregas via módulo próprio de Parceiro Logístico (afiliado logístico, corridas, roteirização, leilão reverso). Estado: ✅ mínimo em produção; plena é PRD em rascunho. Fonte: skills `regras-de-negocio`, `industria24-marketplace`; código em `src/app/corridas/`, `(afiliado)/afiliado/logistica/`, `(parceiro)/parceiro/`, `(seller)/seller/parceiro-logistica/`, `(seller)/seller/rotas/`, `src/lib/geo.ts` (Google Routes API).

## Requirements

### Requirement: Afiliado logístico é por produto
O sistema SHALL conceder exclusividade de 5 minutos ao afiliado logístico apenas quando TODOS os itens com entrega do pedido tiverem `produtos.permite_logistica_afiliado = true` (default `true`); caso contrário, a corrida vai para o pool geral de entregadores.

#### Scenario: Pedido com item que não permite afiliado
- GIVEN um pedido com ao menos um item com `permite_logistica_afiliado = false`
- WHEN a corrida é despachada
- THEN a exclusividade de 5 minutos para o afiliado logístico NÃO se aplica; a corrida vai direto ao pool geral

### Requirement: Despacho automático não despacha lote consolidado sozinho
O sistema SHALL disparar `despachar_corrida_automatica` no momento do pagamento para corridas individuais, mas MUST NOT despachar automaticamente pedidos marcados como `frete_consolidado` — esses esperam a formação do lote em `/admin/lotes`.

#### Scenario: Pedido pago marcado como consolidado
- GIVEN um pedido pago com `pedidos.frete_consolidado = true`
- WHEN o pagamento é confirmado
- THEN `despachar_corrida_automatica` NÃO despacha esse pedido sozinho; ele aguarda ação manual do admin em `/admin/lotes`

### Requirement: Registro de percurso real
O sistema SHALL gravar na corrida o percurso real (distância, tempo, link) obtido via Google Distance Matrix / Routes API, não uma estimativa estática.

#### Scenario: Corrida concluída grava percurso
- GIVEN uma corrida em andamento
- WHEN ela é concluída
- THEN o percurso real (km, minutos, link do mapa) é gravado no registro da corrida

### Requirement: Corredor de CEP para consolidação de carga
O sistema SHALL agrupar em um mesmo lote apenas pedidos pagos da MESMA loja cujo CEP de destino compartilha o mesmo prefixo de 3 dígitos (mesmo corredor).

#### Scenario: Pedidos de lojas diferentes não se agrupam
- GIVEN dois pedidos pagos com o mesmo corredor de CEP mas de lojas diferentes
- WHEN o sistema forma lotes de consolidação
- THEN os dois pedidos NÃO entram no mesmo lote

## Known Gaps
- **Uber Direct** (cotação, criação de entrega, tracking, reembolso via `/v1/direct/{customer_id}/submit_refund`) está descrito e padronizado na skill `uber-direct-integration`, e há evidência de trabalho em sandbox (env `UBER_DIRECT_WEBHOOK_SIGNING_KEY` configurada em Preview/Production na Vercel, commit "webhook Uber Direct de sandbox + hipótese de assinatura HMAC"), mas **nenhum arquivo `services/delivery/uberDirect.ts` ou rota `/api/webhooks/uber-direct` foi encontrado em `master`** no momento desta spec — não afirmar que Uber Direct está em produção sem confirmar em código real antes de qualquer trabalho novo aqui.
- Refund API da Uber Direct não vem habilitada por padrão — exige acordo comercial à parte, não implementar assumindo que funciona em produção.
- Crédito/Parceiro logística (PR #35) está aberto, não mergeado, sem dado real — não tratar como existente.
- Regra de disputa/proteção ao comprador em caso de entrega com problema está coberta pelo módulo de pós-venda (ver spec `pos-venda-disputas`), não por este domínio.
