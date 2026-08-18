## Purpose

Garantir que falhas ou divergências nas etapas financeiras críticas do checkout (cobrança, repasse, comissão de afiliado) gerem alerta ativo, não apenas captura passiva de erro, para evitar incidentes de dinheiro creditado errado passarem despercebidos.

## ADDED Requirements

### Requirement: Alerta em falha de etapa financeira crítica
O sistema SHALL disparar um alerta observável quando uma etapa financeira crítica do checkout (finalização de compra, cálculo de repasse, cálculo de comissão de afiliado) falhar.

#### Scenario: Falha na finalização da compra
- **WHEN** a função de finalização de compra lança erro ou não completa a persistência do pedido
- **THEN** o sistema registra o erro no Sentry com contexto suficiente para identificar o pedido afetado e dispara alerta, não apenas loga silenciosamente

#### Scenario: Cálculo de comissão diverge do esperado
- **WHEN** o valor de comissão calculado para um afiliado diverge da regra de negócio esperada (ex.: creditado a afiliado sem indicação válida)
- **THEN** o sistema registra o evento como anomalia financeira, distinguível de um erro técnico comum

### Requirement: Alerta não bloqueia a transação do usuário
O sistema SHALL disparar o alerta de forma assíncrona ou não bloqueante, de modo que uma falha no próprio mecanismo de alerta não impeça a etapa financeira de completar quando ela seria bem-sucedida.

#### Scenario: Falha no envio do alerta
- **WHEN** o serviço de alerta (Sentry) está indisponível no momento de uma etapa financeira bem-sucedida
- **THEN** a etapa financeira completa normalmente para o usuário, e a falha de alerta é registrada separadamente

### Requirement: Contexto suficiente para diagnóstico sem acesso a dado sensível desnecessário
O sistema SHALL incluir no alerta o identificador do pedido, valor e etapa afetada, sem incluir dado de pagamento sensível (ex.: dado de cartão) que não seja necessário ao diagnóstico.

#### Scenario: Alerta de falha de checkout
- **WHEN** um alerta de falha de etapa financeira é gerado
- **THEN** o alerta contém identificador do pedido, etapa e valor, e não contém dado de cartão ou credencial de pagamento
