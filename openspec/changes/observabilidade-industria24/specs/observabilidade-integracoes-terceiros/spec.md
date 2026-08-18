## Purpose

Detectar proativamente a expiração silenciosa de tokens de integrações externas (Meta WhatsApp, Mercado Envios, MCP terceiros) antes que o fluxo dependente quebre em produção sem aviso.

## ADDED Requirements

### Requirement: Check periódico de validade de token
O sistema SHALL executar uma verificação periódica de validade para cada token de integração externa com risco de expiração silenciosa.

#### Scenario: Token ainda válido
- **WHEN** a verificação periódica confirma que um token de integração está válido
- **THEN** o sistema registra o check como bem-sucedido, sem gerar alerta

#### Scenario: Token expirado ou inválido detectado
- **WHEN** a verificação periódica detecta que um token retorna erro de autenticação
- **THEN** o sistema registra a falha e dispara alerta identificando qual integração e qual token está afetado

### Requirement: Cobertura mínima de integrações críticas
O sistema SHALL cobrir, no mínimo, os tokens de Meta WhatsApp Business API, Mercado Envios e MCP de terceiros usados em produção.

#### Scenario: Nova integração externa adicionada
- **WHEN** uma nova integração externa com token de expiração é adicionada ao projeto
- **THEN** o padrão de check periódico é aplicado a ela antes de entrar em produção

### Requirement: Alerta não interrompe o fluxo dependente antes da expiração real
O sistema SHALL apenas alertar sobre proximidade ou ocorrência de expiração, sem bloquear preventivamente o uso da integração enquanto ela ainda funciona.

#### Scenario: Token próximo da expiração mas ainda válido
- **WHEN** o check detecta que um token está próximo do vencimento mas ainda responde com sucesso
- **THEN** o sistema alerta sobre a proximidade da expiração, sem interromper o uso normal da integração
