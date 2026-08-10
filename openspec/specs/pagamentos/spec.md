# Pagamentos (Asaas) Specification

## Purpose
Integração de pagamento via Asaas (PIX/boleto/cartão), confirmação por webhook, e ledger interno de repasse a lojista e afiliado. Estado: ✅ checkout construído/produção, repasse é ledger manual (não split nativo). Fonte: skill `asaas-pagamentos`; código em `src/lib/asaas.ts`, `src/app/api/asaas/webhook/route.ts`, migration `0084_admin_repasses_estorno.sql`, `src/app/(admin)/admin/repasses/`.

## Requirements

### Requirement: Cliente Asaas server-only
O sistema SHALL manter toda chamada à API Asaas (`ensureCustomer`, `createPayment`, `cancelPayment`, `getPixQrCode`) server-side, nunca expondo a chave de API no client.

#### Scenario: Sem chave configurada, checkout não finge cobrança
- GIVEN a env `ASASS_API_KEY` vazia ou ausente
- WHEN um comprador finaliza o checkout
- THEN `isAsaasConfigured` é `false`, o pedido é criado sem cobrança real, e a interface mostra aviso honesto pedindo para combinar pagamento com a loja — nunca simula uma resposta de PSP

### Requirement: Split de comissão é ledger interno, não recurso nativo do Asaas
O sistema MUST calcular e registrar a divisão de comissão (plataforma/lojista/afiliado) apenas no banco de dados, via RPC `calcular_repasses_pedido`, nunca através do Split de Pagamento nativo do Asaas nem de `POST /transfers` — ambos foram descartados por decisão de projeto (2026-07-25) e não devem ser reabertos sem pedido explícito do dono.

#### Scenario: Cálculo de repasse é idempotente
- GIVEN um pedido pago
- WHEN `calcular_repasses_pedido(pedido_id)` roda mais de uma vez
- THEN o upsert em `repasses` não duplica nem sobrescreve um repasse cujo status já saiu de `pendente`

### Requirement: Status do ledger de repasse
O sistema SHALL manter o campo de status de cada repasse dentro do conjunto fechado `pendente`, `transferido`, `falhou`, `inelegivel`, `estornado`, sem transição automática para `transferido` — a confirmação de PIX manual feito pelo financeiro é responsabilidade do admin.

#### Scenario: Admin confirma transferência manual
- GIVEN um repasse com status `pendente`
- WHEN o admin faz o PIX manual fora do sistema e marca o repasse como `transferido` em `/admin/repasses`
- THEN o status muda de `pendente` para `transferido`, sem nenhuma automação disparando isso sozinha

### Requirement: Webhook de confirmação de pagamento
O sistema SHALL expor `POST /api/asaas/webhook`, validar o header `asaas-access-token` contra a env `ASAAS_WEBHOOK_TOKEN`, e responder `401` quando o token não bater.

#### Scenario: Evento de pagamento confirmado credita o pedido
- GIVEN um evento `PAYMENT_RECEIVED` ou `PAYMENT_CONFIRMED` com `asaas_cobranca_id` batendo o pedido e `payment.value >= valor_pedido`
- WHEN o webhook processa o evento
- THEN o pedido é marcado como pago

#### Scenario: Evento de cancelamento/estorno
- GIVEN um evento `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_CANCELED` ou `PAYMENT_REFUNDED`
- WHEN o webhook processa o evento
- THEN o pedido é marcado como cancelado

#### Scenario: Evento não reconhecido não derruba a fila
- GIVEN um evento de webhook que o handler não reconhece
- WHEN o webhook o recebe
- THEN o handler responde `200` (nunca erro genérico) — a Asaas interrompe a fila de sincronização após 15 falhas consecutivas não-2xx

### Requirement: Estorno de pedido não chama a Asaas
O sistema SHALL, ao rodar `admin_estornar_pedido(pedido_id, motivo)`, cancelar o pedido, liberar itens de estoque não transferidos e marcar repasses `pendente` como `estornado` — a reversão financeira real do lado do comprador continua manual, fora do sistema.

#### Scenario: Admin estorna pedido pago
- GIVEN um pedido pago com repasses ainda `pendente`
- WHEN o admin roda `admin_estornar_pedido`
- THEN o pedido é cancelado, o estoque dos itens não transferidos é liberado, os repasses pendentes viram `estornado`, e nenhuma chamada é feita à API do Asaas

### Requirement: Sandbox obrigatório antes de produção
O sistema MUST usar as credenciais de Sandbox do Asaas em ambiente de teste; nunca simular resposta do Asaas com valor fixo — a chamada é real ou o recurso fica desabilitado com aviso de "integração pendente".

#### Scenario: Ambiente de teste sem chave de produção
- GIVEN um ambiente de Preview/desenvolvimento
- WHEN a integração Asaas é testada
- THEN usa-se uma chave Sandbox (`$aact_hmlg_...`), nunca uma chave de Produção (`$aact_prod_...`)

## Known Gaps
- Repasse PIX automático ao lojista (antigo PR #43, migration 0058, webhook `/transfers`) é referência morta — não existe em produção, não usar como base.
- Seller e afiliado não têm tela própria de "meus repasses" hoje — RLS restringe a tabela `repasses` só a admin.
- Carência de saque do afiliado é de 15 dias, mas o ponto de início da contagem e o tipo de bloqueio ainda não têm decisão do dono — não implementar saque sem fechar esse detalhe.
