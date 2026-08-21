## Purpose

Permitir que o industria24.com.br envie e receba mensagens de WhatsApp via
BubbleWhats, usando um aparelho/número já conectado e compartilhado com outra
aplicação externa, sem depender da integração Meta Cloud API existente e sem
interferir na conexão desse aparelho.

## ADDED Requirements

### Requirement: Envio de mensagem via BubbleWhats
O sistema SHALL enviar mensagens de texto fazendo
`POST {BUBBLEWHATS_API_URL}/send-message` com header
`Authorization: {BUBBLEWHATS_TOKEN}` e body `{ "jid": string, "message": string }`,
e SHALL virar no-op explícito (nunca fingir sucesso) quando
`BUBBLEWHATS_TOKEN`/`BUBBLEWHATS_API_URL` não estiverem configurados.

#### Scenario: Envio bem-sucedido
- **WHEN** `send-message` responde 200
- **THEN** a função retorna sucesso

#### Scenario: Token inválido
- **WHEN** `send-message` responde 401
- **THEN** a função retorna falha distinta de "número inexistente" e loga o
  código 401 com tag `gateway: bubblewhats`

#### Scenario: Timeout ou número não existe no WhatsApp
- **WHEN** `send-message` responde 408
- **THEN** a função retorna falha distinta de erro de configuração

#### Scenario: Parâmetro faltando
- **WHEN** `send-message` responde 422
- **THEN** a função retorna falha indicando payload inválido

#### Scenario: Aparelho desconectado
- **WHEN** `send-message` responde 502
- **THEN** a função retorna falha indicando aparelho desconectado e loga em
  nível de alerta (isso afeta a outra aplicação que compartilha o aparelho)

### Requirement: Webhook de recebimento autenticado por secret na query string
O sistema SHALL expor `POST /api/webhooks/bubblewhats` e SHALL validar o
parâmetro de query `secret` contra `BUBBLEWHATS_WEBHOOK_SECRET` antes de ler
ou processar qualquer payload do corpo da requisição.

#### Scenario: Secret ausente ou inválido
- **WHEN** a requisição chega sem `?secret=` ou com valor diferente de
  `BUBBLEWHATS_WEBHOOK_SECRET`
- **THEN** o sistema responde 401 e não lê nem processa o body

#### Scenario: Secret válido
- **WHEN** a requisição chega com `?secret=` igual a `BUBBLEWHATS_WEBHOOK_SECRET`
- **THEN** o sistema processa o payload conforme o tipo de evento (mensagem
  recebida, status de mensagem, status do aparelho)

### Requirement: Não interferência com o aparelho compartilhado
O sistema SHALL restringir suas chamadas à API BubbleWhats a `send-message` e
ao recebimento de eventos no próprio webhook, e SHALL NOT chamar qualquer
endpoint de configuração do aparelho, do webhook cadastrado no painel, ou do
plano.

#### Scenario: Mudança que afetaria a configuração do aparelho
- **WHEN** uma tarefa de implementação exigiria criar, editar ou remover a
  configuração do aparelho/webhook/plano no painel BubbleWhats
- **THEN** a implementação para e pede confirmação explícita ao usuário antes
  de prosseguir

### Requirement: Isolamento da integração Meta Cloud API existente
O sistema SHALL manter a integração BubbleWhats em arquivos próprios
(`src/lib/bubblewhats.ts`, `src/app/api/webhooks/bubblewhats/route.ts`),
SHALL NOT modificar `src/lib/whatsapp.ts` nem
`src/app/api/bot/whatsapp/webhook` como parte deste trabalho.

#### Scenario: PR desta capability
- **WHEN** um PR implementa `integracao-bubblewhats`
- **THEN** o diff não toca `src/lib/whatsapp.ts` nem `src/app/api/bot/whatsapp/webhook`
