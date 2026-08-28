## Purpose

Garante que a confirmação de pagamento de um pedido (via webhook Asaas ou via verificação manual na página do pedido) execute seus efeitos colaterais (mudança de status, marcação de `linha_itens.pago`, avisos por WhatsApp, e-mail, despacho de corrida ou entrega Uber Direct) no máximo uma vez, independente de quantas vezes a Asaas reenviar o evento e de qual status o pedido já tenha alcançado.

## ADDED Requirements

### Requirement: Curto-circuito por pagamento já registrado
O sistema SHALL considerar a confirmação de pagamento como já processada quando `pedidos.dt_pagamento` não for nulo, e nesse caso SHALL retornar sucesso sem reexecutar nenhum efeito colateral.

#### Scenario: Evento de pagamento reenviado com o pedido já entregue
- **WHEN** a Asaas reenvia `PAYMENT_RECEIVED` para um pedido cujo `status_pedido` já é `Entregue` (ou `Concluído`, `Em Disputa`, `Cancelado`) e `dt_pagamento` já está preenchido
- **THEN** a confirmação retorna `{ ok: true, ja_estava_pago: true }`, o status do pedido não muda, `linha_itens` não é remarcado, nenhum WhatsApp ou e-mail é reenviado e nenhuma corrida ou entrega é despachada

#### Scenario: Webhook e verificação manual quase simultâneos
- **WHEN** o comprador clica em "Verificar pagamento" no mesmo instante em que o webhook chega, e ambos passam pelo curto-circuito ao mesmo tempo (ainda com `dt_pagamento` nulo)
- **THEN** a gravação de `status_pedido = 'Pagamento Realizado'` e `dt_pagamento` é condicionada a `dt_pagamento is null` (update condicional), de forma que apenas a primeira gravação dispara os efeitos colaterais e a segunda vê zero linhas afetadas e retorna como já pago

### Requirement: Verificação de valor e cobrança preservada
O sistema SHALL manter a verificação de que o `payment.id` do evento bate com `pedidos.asaas_cobranca_id` e de que `payment.value` cobre `pedidos.valor_pedido`, antes de registrar o pagamento.

#### Scenario: Evento com id de cobrança de outro pedido
- **WHEN** chega um evento cujo `payment.id` não corresponde ao `asaas_cobranca_id` do pedido referenciado
- **THEN** a confirmação retorna `{ ok: false, motivo: "cobranca_nao_confere" }` e nada é gravado

## MODIFIED behavior notes

- Substitui o guard atual (`asaas-confirmar.ts:296`), que compara `status_pedido` contra a lista fixa `["Pagamento Realizado", "Em Separação", "Enviado"]`, por `dt_pagamento is not null`.
- A gravação de status/`dt_pagamento` passa a ser um update condicionado a `dt_pagamento is null` com verificação de linhas afetadas, para fechar a janela entre o guard e o write sob concorrência.
- Nenhuma mudança no webhook (`api/asaas/webhook/route.ts`), na validação do token, nem nos conjuntos `EVENTOS_PAGO` / `EVENTOS_CANCELADO`.
