# Mensagens (Chat Comprador↔Vendedor) Specification

## Purpose
Chat direto entre comprador e loja, base reaproveitada também pelo módulo de pós-venda/disputas. Estado: ✅ produção (PR #88). Fonte: skill `regras-de-negocio`; código em `mensagens/`, `mensagens/[id]/`, `(seller)/seller/mensagens/`, migration `0075_chat_comprador_vendedor.sql`, componente `ChatThread.tsx`.

## Requirements

### Requirement: Conversa por comprador × loja × produto
O sistema SHALL escopar cada conversa a uma combinação específica de comprador, loja e produto — não é um chat genérico entre as partes.

#### Scenario: Mesmo comprador e loja, produtos diferentes
- GIVEN um comprador que já conversou com uma loja sobre o Produto A
- WHEN ele inicia contato com a mesma loja sobre o Produto B
- THEN uma conversa distinta é criada, não reaproveitando a thread do Produto A

### Requirement: Corpo da mensagem imutável após envio
O sistema MUST impedir a edição do corpo de uma mensagem após o envio; a RLS libera apenas a atualização da coluna `lida_em`, nem mesmo o autor pode editar o conteúdo.

#### Scenario: Tentativa de editar mensagem enviada
- GIVEN uma mensagem já enviada na conversa
- WHEN qualquer participante (incluindo o autor) tenta alterar o corpo da mensagem
- THEN a RLS bloqueia a alteração; apenas `lida_em` pode ser atualizado

### Requirement: Autenticação Realtime antes de subscrever
O sistema SHALL chamar `setAuth(session.access_token)` antes de `.subscribe()` no canal Realtime da conversa — sem isso, a RLS bloqueia o stream inteiro, não apenas mensagens específicas.

#### Scenario: Subscrição sem setAuth prévio
- GIVEN um cliente tentando abrir o canal Realtime de uma conversa
- WHEN `.subscribe()` é chamado sem `setAuth(session.access_token)` antes
- THEN o stream inteiro fica bloqueado pela RLS, não apenas mensagens específicas

### Requirement: Base reaproveitada pelo módulo de disputas
O sistema SHALL reutilizar a infraestrutura de `conversas`/`mensagens` como histórico de comunicação de uma disputa de pós-venda (nova conversa vinculada ao pedido, ou extensão de conversa já existente), em vez de criar um chat paralelo — ver spec `pos-venda-disputas`.

#### Scenario: Abertura de disputa cria conversa vinculada
- GIVEN um comprador abrindo uma disputa sobre um pedido
- WHEN a disputa é criada
- THEN uma conversa é vinculada a ela reaproveitando a tabela `conversas`/`mensagens`, sem criar um chat paralelo

## Known Gaps
- Não há centro de notificação in-app; notificações relacionadas a mensagens/disputas usam e-mail transacional (Resend).
