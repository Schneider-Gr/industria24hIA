## Why

O industria24.com.br já envia WhatsApp via Meta Cloud API (`src/lib/whatsapp.ts`,
`WHATSAPP_TOKEN`/`WHATSAPP_PHONE_ID`). Agora precisa também enviar e receber
mensagens via **BubbleWhats**, usando o MESMO número/aparelho que já está
conectado e em produção para outra aplicação/integração fora deste
repositório. Essa segunda integração não pode, em nenhuma hipótese, cancelar,
desconectar ou substituir a conexão existente do aparelho — as duas aplicações
usam a API do mesmo dispositivo de forma independente.

## What Changes

- Novo client `src/lib/bubblewhats.ts` para envio de mensagem de texto via
  `POST {BUBBLEWHATS_API_URL}/send-message`, seguindo o mesmo padrão de
  "no-op explícito quando não configurado" já usado em `whatsapp.ts`.
- Nova rota `src/app/api/webhooks/bubblewhats/route.ts` para receber eventos
  (mensagem recebida, atualização de status de mensagem, status do aparelho),
  validando `?secret=` na query string contra `BUBBLEWHATS_WEBHOOK_SECRET`
  antes de processar qualquer payload — mesmo padrão de webhook de
  `src/app/api/webhooks/uber-direct/route.ts`.
- Tratamento explícito dos códigos de resposta do `send-message` (200 sucesso,
  401 token inválido, 408 timeout/número inexistente, 422 parâmetro faltando,
  502 aparelho desconectado), com log/Sentry por código.

## Out of Scope

- Qualquer alteração de configuração no painel BubbleWhats (aparelho, webhooks
  cadastrados, plano). Se alguma ação neste trabalho parecer que vai tocar
  essa configuração, ela para e pede confirmação antes de prosseguir.
- Qualquer mudança na integração Meta Cloud API existente (`src/lib/whatsapp.ts`,
  `src/app/api/bot/whatsapp/webhook`).
- Migração ou substituição de uma integração pela outra — as duas convivem.

## Capabilities

### New Capabilities
- `integracao-bubblewhats`: envio de mensagem de texto e recebimento de
  eventos via BubbleWhats, compartilhando o aparelho com outra aplicação
  externa, sem tocar a configuração desse aparelho.

## Impact

- Novos arquivos: `src/lib/bubblewhats.ts`, `src/lib/bubblewhats.test.ts`,
  `src/app/api/webhooks/bubblewhats/route.ts`.
- Env vars novas (já configuradas no Vercel, produção e preview):
  `BUBBLEWHATS_DEVICE_ID`, `BUBBLEWHATS_TOKEN`, `BUBBLEWHATS_API_URL`,
  `BUBBLEWHATS_WEBHOOK_SECRET`.
- Nenhum arquivo da integração Meta Cloud API é alterado.
- Issue de acompanhamento: #346.
