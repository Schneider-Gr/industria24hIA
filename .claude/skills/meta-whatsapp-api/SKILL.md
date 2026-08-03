---
name: meta-whatsapp-api
description: Configurar, renovar acesso, testar e depurar a integração WhatsApp Cloud API da Meta (app industria24h-api, ID 2032763627342851) para a plataforma industria24.com.br. Use quando o usuário pedir para mexer no app Meta Developers, renovar data access, configurar webhook do WhatsApp, trocar token/verify token, publicar o app, ou depurar por que o bot não está enviando/recebendo mensagens.
---

# Meta WhatsApp Cloud API — industria24h

## Identidade do app (Meta Developers)

- App: `industria24h-api`
- App ID: `2032763627342851`
- Modo: Ativo, **não publicado** — `whatsapp_business_messaging` e
  `whatsapp_business_management` estão em "Pronto para teste" (Standard
  Access), então só entrega para números na lista de testadores
- Empresa/Business Manager: industria24h (ID `980768437264241`) —
  **verificação da empresa CONCLUÍDA** (confirmado no painel em 31/07)
- Aba do browser autorizada para navegar no Meta Developers: conta
  `industria24hs@gmail.com` (nunca aba nova/deslogada — ver memória
  `reference-meta-developers-aba-industria24hs`)
- **Existem DUAS WABAs** no Business Manager, e o app usa a errada:
  - `Test WhatsApp Business Account` (ID `1777484063270273`) — número de
    teste `+1 555-185-8259`, Conectado. É a que o app usa hoje.
  - `Industria 24h` (ID `1348786780115433`) — número oficial
    **+55 11 91866-4481**, Phone Number ID **`914894061706131`**,
    status **Offline**.
- O número oficial está **Offline porque a WABA `Industria 24h` é do tipo
  "Aplicativo WhatsApp Business"** (o app do celular), não Cloud API. Usá-lo
  na Cloud API exige a migração app→Cloud API, que **desconecta o número do
  app no celular de forma definitiva**. Não é reversível por clique.
- **Nenhum System User existe** no Business Manager (conferido 31/07) — logo
  não há token permanente; qualquer `WHATSAPP_TOKEN` na Vercel hoje é um
  token temporário de painel (24h) e está expirado.

## Onde isso vive no código (`web/`)

- `src/lib/whatsapp.ts` — envio via Cloud API (`graph.facebook.com/v21.0/{PHONE_ID}/messages`).
  `isWhatsappConfigured` checa `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID`; sem
  as duas, o envio é no-op explícito (nunca finge sucesso).
- `src/app/api/bot/whatsapp/webhook/route.ts` — `GET` faz o handshake de
  verificação (`hub.verify_token` comparado a `WHATSAPP_VERIFY_TOKEN`, uma
  string nossa — **não é a App Secret**); `POST` recebe mensagens inbound,
  identifica o contato por e-mail (`resolver_usuario_por_contato`) antes de
  liberar dado sensível, processa via `processarMensagemBot` e responde
  com `enviarWhatsapp`.
- Variáveis de ambiente (Vercel, produção industria24.com.br):
  - `WHATSAPP_TOKEN` — token de acesso da Cloud API (permanente, gerado no
    app da Meta / System User do Business Manager)
  - `WHATSAPP_PHONE_ID` — Phone Number ID do número WhatsApp Business
  - `WHATSAPP_VERIFY_TOKEN` — string arbitrária nossa (48 hex já gerado),
    usada só no handshake `GET` do webhook, nunca enviada à Meta como
    segredo do app
  - Todas marcadas *Sensitive* na Vercel → `vercel env pull`/`ls` não
    mostra o valor; isso é esperado, não é bug (ver memória
    `industria24h-vercel-env-sensitive-supabase-nao-legivel`)

## Fluxo de configuração no painel Meta Developers

1. **App Dashboard** → produto **WhatsApp** → **Configuração da API** (ou
   **Introdução**) para ver/gerar o token temporário e o Phone Number ID
   de teste, ou o número real já vinculado ao Business Manager.
2. **WhatsApp → Configuração** (`wa-configurations-v2`) → **Webhook**:
   - Callback URL: `https://industria24.com.br/api/bot/whatsapp/webhook`
   - Verify Token: valor de `WHATSAPP_VERIFY_TOKEN` (mesmo da Vercel,
     nunca a App Secret)
   - Clicar **Verificar e salvar**: o Meta chama o `GET` com
     `hub.mode=subscribe`; a rota responde o `hub.challenge` só se o token
     bater — se falhar, checar se a env da Vercel bate byte-a-byte (sem
     BOM/espaço; o código já faz `.trim()` e remove BOM residual)
   - Em **Campos do Webhook**, assinar `messages` (é o único campo que a
     rota `POST` consome hoje)
3. **Gerar token permanente**: token temporário do painel expira em 24h —
   para produção, gerar via **System User** do Business Manager (Meta
   Business Suite → Configurações do negócio → Usuários do sistema →
   Gerar novo token, permissão `whatsapp_business_messaging` +
   `whatsapp_business_management`), colar em `WHATSAPP_TOKEN` na Vercel.
4. **Publicar o app** (App Review) só é necessário para o número real sair
   de `NOT_VERIFIED` e aceitar tráfego de qualquer usuário, não apenas
   testadores/números de teste cadastrados em **WhatsApp → Configuração
   da API → Para → Gerenciar lista** enquanto em modo de desenvolvimento.

## Data Access Renewal (App Review periódico da Meta)

Referência: https://developers.facebook.com/documentation/resp-plat-initiatives/data-access-renewal/tutorial

A Meta exige renovação periódica de acesso a dados para apps com
permissões sensíveis (aqui: `whatsapp_business_messaging`,
`whatsapp_business_management`). Etapas do fluxo no painel:

1. **Business Connection** — confirmar a organização verificada
   (`industria24h`) conectada ao app. Se aparecer "não verificado",
   verificação é feita via Business Suite antes de prosseguir — parar e
   avisar o usuário, é ação que exige documentos da empresa.
2. **Allowed Usage** — certificar que cada permissão concedida é
   realmente usada. Remover qualquer permissão que o app peça mas o
   código não consuma (checar contra `src/lib/whatsapp.ts` e a rota do
   webhook — hoje só mensagens de texto e o metadado de telefone).
3. **Data Handling Questions** — perguntas sobre como os dados são
   processados/armazenados. Respostas devem refletir o código real:
   - Mensagens e telefone ficam em `bot_conversas`/`bot_mensagens`
     (Supabase, RLS admin-only, migration `0088`). Colunas de
     `bot_conversas`: `id, canal, usuario_id, telefone, identificado_em,
     status, jira_issue_key, created_at, updated_at` — a data é
     `created_at`, não `criado_em`.
   - Nenhum dado de mensagem é compartilhado com terceiros
   - Retenção/exclusão: seguir a política de privacidade publicada em
     industria24.com.br (checar se há endpoint de exclusão de conta antes
     de responder "sim" a perguntas de deleção sob pedido)
4. **Data Protection** (propósito, compartilhamento, exclusão, segurança)
   — mesma lógica: responder com o que o código realmente faz, nunca
   aspiracional. Se a resposta certa exigir uma feature que não existe
   (ex.: endpoint de exclusão de dados sob pedido), reportar ao usuário
   antes de submeter — submeter resposta que o código não cumpre é risco
   de suspensão do app.
5. **Reviewer Instructions** — fornecer URL da política de privacidade
   (`industria24.com.br/...`, confirmar rota atual antes de colar) e um
   passo a passo de como testar o bot (ex.: número de WhatsApp de teste →
   mandar e-mail cadastrado → perguntar status de pedido).
6. Prazo típico de análise: 10-15 dias úteis. Existe uma data-limite de
   corte visível no dashboard do app — checar e avisar o usuário com
   antecedência, perda do prazo pode restringir o acesso.

**Nunca preencher esse formulário com respostas genéricas/copiadas da
documentação da Meta** — cada resposta tem que ser validada contra o
código atual (`whatsapp.ts`, rota do webhook, migration 0088, RLS). Se
não achar a resposta no código, perguntar ao usuário antes de submeter.

## Segurança

- App Secret do app `2032763627342851` foi exposta em texto puro em sessão
  anterior (27/07) e está **comprometida** — nunca reutilizar aquele
  valor. Rotação ficou pendente (usuário travou no modal de senha do
  Meta). Antes de qualquer nova configuração, confirmar se a rotação já
  foi concluída; se não, é a primeira ação a sugerir.
- App Secret **não é usada pelo código atual** (só `WHATSAPP_TOKEN` e
  `WHATSAPP_VERIFY_TOKEN`) — não pedir para colar a App Secret em lugar
  nenhum do chat de novo.
- Segredo colado no chat pelo usuário → nunca digitar/persistir; devolver
  o comando com prefixo `!` para o usuário rodar fora do transcript e
  lembrar de rotacionar.

## Testes

- Handshake do webhook: `GET
  https://industria24.com.br/api/bot/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=123`
  deve devolver `123` (200); token errado deve devolver 403.
- Envio: com `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_ID` configurados, chamar
  `enviarWhatsapp` a partir de um número de teste cadastrado no painel
  (modo desenvolvimento só entrega para números na lista).
- Ponta a ponta: mandar mensagem de um número de teste → bot deve pedir
  e-mail (se conversa não identificada) → depois de identificado, aceitar
  perguntas sobre pedido/afiliação.
- `src/app/api/bot/health/route.ts` reporta **apenas** `{openai, service}` —
  **não** expõe `isWhatsappConfigured`. Não serve para validar WhatsApp.
- Estado do banco em 31/07: `bot_conversas` e `bot_mensagens` com **0 linhas**
  — nenhuma mensagem inbound jamais chegou em produção.
- ⚠ Pendência de segurança (não corrigida): o `POST` do webhook **não valida
  `X-Hub-Signature-256`**. Quem souber a URL injeta mensagem falsa, cria
  conversa e queima chamada de OpenAI. Fechar antes de o número real entrar
  no ar.
