## Purpose

Garantir que falhas de assinatura ou timeout nos webhooks recebidos do Asaas sejam registradas e alertadas, em vez de descobertas apenas quando o cliente reclama de um pagamento não refletido no sistema.

## ADDED Requirements

### Requirement: Registro de falha de validação de assinatura
O sistema SHALL registrar toda tentativa de webhook do Asaas cuja assinatura não passar na validação, sem processar o payload não confiável.

#### Scenario: Assinatura inválida recebida
- **WHEN** um webhook do Asaas chega com assinatura que não corresponde ao segredo configurado
- **THEN** o sistema rejeita o processamento do payload e registra o evento como falha de validação, incluindo timestamp e origem

### Requirement: Alerta em timeout de processamento de webhook
O sistema SHALL registrar e alertar quando o processamento de um webhook do Asaas exceder o tempo esperado ou falhar por erro interno.

#### Scenario: Timeout no processamento
- **WHEN** o processamento de um webhook recebido excede o limite de tempo aceitável
- **THEN** o sistema registra a falha com o identificador do evento Asaas associado, permitindo reprocessamento manual

### Requirement: Idempotência registrada em reprocessamento
O sistema SHALL registrar quando um webhook já processado é recebido novamente, sem tratar como novo evento nem gerar alerta de falha indevido.

#### Scenario: Webhook duplicado
- **WHEN** o Asaas reenvia um webhook cujo identificador de evento já foi processado com sucesso
- **THEN** o sistema registra a duplicata como esperada, sem reprocessar a lógica de negócio nem alertar como falha

### Requirement: Alerta distinto para falha de webhook em etapa financeira crítica
O sistema SHALL diferenciar, no alerta gerado, uma falha de webhook associada a repasse ou split (crítica) de uma falha em webhook informativo de menor impacto.

#### Scenario: Falha em webhook de confirmação de pagamento
- **WHEN** um webhook relacionado à confirmação de pagamento ou repasse falha ao processar
- **THEN** o alerta gerado é marcado com prioridade crítica, distinta de falhas em webhooks não financeiros
