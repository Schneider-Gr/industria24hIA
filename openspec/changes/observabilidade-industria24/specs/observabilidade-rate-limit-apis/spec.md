## Purpose

Monitorar o consumo de rate limit das APIs externas usadas em produção (Asaas, ViaCEP, Maps, WhatsApp Business API) para alertar antes do estouro, em vez de descobrir pela falha em cascata dos fluxos dependentes.

## ADDED Requirements

### Requirement: Registro de consumo de rate limit por API externa
O sistema SHALL registrar, quando a API externa expõe essa informação na resposta (ex.: headers de rate limit), o consumo atual em relação ao limite.

#### Scenario: Resposta com header de rate limit
- **WHEN** uma chamada a uma API externa retorna informação de rate limit restante
- **THEN** o sistema registra esse valor para consulta posterior

### Requirement: Alerta de proximidade de estouro
O sistema SHALL disparar alerta quando o consumo de rate limit de uma API externa crítica ultrapassar um limiar de proximidade do limite.

#### Scenario: Consumo próximo do limite
- **WHEN** o consumo registrado de uma API externa ultrapassa o limiar de alerta configurado
- **THEN** o sistema dispara um alerta identificando a API e o percentual de consumo

### Requirement: Registro de estouro efetivo de rate limit
O sistema SHALL registrar quando uma chamada a API externa falhar especificamente por erro de rate limit excedido (ex.: HTTP 429).

#### Scenario: Chamada rejeitada por rate limit
- **WHEN** uma API externa retorna erro de rate limit excedido
- **THEN** o sistema registra o evento distinguindo-o de outros tipos de erro de chamada externa

### Requirement: Cobertura mínima de APIs críticas de produção
O sistema SHALL cobrir, no mínimo, o monitoramento de rate limit de Asaas, ViaCEP, Maps e WhatsApp Business API.

#### Scenario: Fluxo de checkout depende de API com rate limit não monitorado
- **WHEN** uma API externa nova é integrada a um fluxo crítico de produção
- **THEN** o monitoramento de rate limit é aplicado a ela antes de considerar a integração completa
