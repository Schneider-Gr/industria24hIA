## Why

Seller novo cria a loja em `/seller/minha-loja` e ela nasce `EmAnalise`, fora da
vitrine e do checkout até um admin ativar em `/admin/lojas`. Hoje nada avisa o
admin: a única pista é a contagem de lojas em análise no menu de `/admin`. Loja
parada em análise é seller que desiste antes de publicar o primeiro produto.

A dona do produto definiu em 15/09/2026 que toda nova solicitação de cadastro de
loja dispara dois avisos ao admin: e-mail para `industria24hs@gmail.com` e
mensagem de WhatsApp via BubbleWhats.

## What Changes

- Ao **criar** uma loja (ramo de INSERT de `salvarLoja` em
  `src/app/(seller)/seller/minha-loja/actions.ts`), depois de persistida, dispara
  em `after()`:
  - **E-mail** via `enviarEmail` (Resend) para `industria24hs@gmail.com`, assunto
    `Quero vender - solicitação de cadastro`, com nome da loja, e-mail e WhatsApp
    do seller quando preenchidos, cidade/UF, data e botão para
    `https://industria24.com.br/admin/lojas/<id>`. Template novo em
    `src/lib/email.ts`, reusando `wrapperEmail`.
  - **WhatsApp** via `enviarBubblewhats` para o número do admin, com a mensagem
    "Nova solicitação de cadastro de loja", nome da loja, contato e link. Template
    novo em `src/lib/bubblewhats.ts`, no estilo dos existentes.
- Número do admin em variável de ambiente (`ADMIN_WHATSAPP_NOVA_LOJA`
  *(nome proposto — confirmar)*), nunca no código.
- Edição de loja existente (ramo de UPDATE) não dispara aviso.
- Falha em qualquer canal é best-effort: não desfaz a loja, não impede o outro
  canal e é registrada no Sentry.

## Out of Scope

- Aviso ao **seller** quando a loja é ativada ou inativada (US06 do PRD 006,
  decisão pendente — change separada).
- Aviso na criação da **conta** (sem loja), a menos que a decisão em aberto abaixo
  mude o gatilho.
- Lembrete ou SLA para loja parada em análise.
- Qualquer alteração no painel BubbleWhats (aparelho, webhook, plano).
- Tabela de histórico de notificações (schema não confirmado).

## Open Decisions

- [ ] Número de WhatsApp do admin que recebe o aviso.
- [ ] Gatilho confirmado: criação da loja (proposto) ou criação da conta.
- [ ] Nome da variável de ambiente do número.

## Capabilities

### New Capabilities
- `admin-aviso-nova-loja`: avisos ao admin por e-mail e WhatsApp quando uma loja
  nova entra em análise, best-effort.

## Impact

- Arquivos: `src/app/(seller)/seller/minha-loja/actions.ts`, `src/lib/email.ts`,
  `src/lib/bubblewhats.ts`, `src/lib/bubblewhats.test.ts` e teste do template de
  e-mail.
- Nenhuma migration.
- **Dependência de configuração bloqueante para o WhatsApp**: `BUBBLEWHATS_API_URL`
  está só em Preview na Vercel. Sem ela em Production, `isBubblewhatsConfigured` é
  falso e nenhum envio BubbleWhats sai em produção (inclusive os avisos de pedido,
  disputa e carrinho abandonado da change `notificacoes-pedido-bubblewhats`).
  Marcar Production + redeploy.
- Issue: #651. PRD 006 (US06, Milestone 4).
