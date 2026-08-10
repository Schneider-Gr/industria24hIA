# Integrações com Terceiros / API Pública Specification

## Purpose
MCP server do marketplace, chaves de API para terceiros, documentação pública para desenvolvedores e consumo de rastreio externo. Fonte: skill `integracao-terceiros-mcp`; código relacionado a `api_keys`, `/desenvolvedores`, migration `0059_api_keys`.

## Requirements

### Requirement: Autenticação de terceiros por api_keys
O sistema SHALL autenticar chamadas de integração externa via `api_keys`, com criação e revogação seguindo trilha de auditoria; a chave nunca aparece em texto puro em log ou documentação.

#### Scenario: Terceiro chama a API com chave revogada
- GIVEN uma `api_key` já revogada
- WHEN uma chamada externa a utiliza
- THEN a chamada é rejeitada

### Requirement: Documentação pública sincronizada com a API
O sistema SHALL manter `/desenvolvedores` atualizada na mesma sessão em que qualquer mudança de API pública for feita.

#### Scenario: Endpoint público muda de contrato
- GIVEN uma mudança no formato de resposta de um endpoint documentado
- WHEN a mudança é publicada
- THEN `/desenvolvedores` é atualizada na mesma sessão, não depois

### Requirement: Integração externa nunca mockada
O sistema MUST usar chamada real (em sandbox quando disponível) para qualquer integração de terceiro, ou desabilitar o recurso com aviso explícito — nunca simular uma resposta.

#### Scenario: Integração sem credencial disponível
- GIVEN uma integração externa sem credencial configurada no ambiente
- WHEN o recurso é acessado
- THEN a interface mostra aviso de "integração pendente" em vez de simular uma resposta de sucesso

### Requirement: Webhook de terceiro valida origem antes de efeito colateral
O sistema SHALL validar a origem/assinatura de todo webhook recebido de um provedor externo, e tratar idempotência, antes de aplicar qualquer efeito colateral (crédito, atualização de status, etc.).

#### Scenario: Webhook com assinatura inválida
- GIVEN um webhook recebido de um provedor externo com assinatura que não confere
- WHEN o handler processa a requisição
- THEN nenhum efeito colateral é aplicado e a requisição é rejeitada

### Requirement: Consumo de rastreio, não provimento
O sistema SHALL apenas consumir rastreio RTT do Mercado Envios (documentado em `/desenvolvedores`) — a Indústria24h não é provedora de serviço de entrega para o Mercado Livre.

#### Scenario: Consulta de rastreio de pedido do Mercado Envios
- GIVEN um pedido rastreável via Mercado Envios
- WHEN o sistema consulta o status
- THEN apenas consome e exibe o rastreio, sem atuar como provedor da entrega

## Known Gaps
- MCP server (PR #48, migration 0059) está mergeado em `master`, mas a aplicação da migration em produção e o deploy em `mcp.industria24.com.br` não estão confirmados — não afirmar que o MCP está no ar sem checar `to_regclass` e fazer QA com MCP Inspector.
- Relação entre Melhor Envio e a tabela `FaixaCEP` ainda não confirmada — perguntar antes de assumir.
