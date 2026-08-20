## Why

A integração BubbleWhats (`bubblewhats-integracao`, PR #349) cobre só o client de
envio e o webhook de recebimento. O comprador de industria24.com.br hoje só
recebe WhatsApp em um momento (código de retirada/entrega, via Meta Cloud API em
`src/lib/whatsapp.ts`) — não é avisado quando o pedido sai para entrega, nem
quando abre uma disputa, quando a loja propõe troca/devolução/reembolso, ou
quando a mediação decide o caso. Cada um desses é hoje silencioso: o comprador
só descobre o estado olhando `/pedido/[id]` manualmente.

## What Changes

- Migrar o envio do código de entrega (`mensagemCodigoComprador`, hoje via
  `enviarWhatsapp`/Meta em `src/app/api/asaas/webhook/route.ts`) para
  `enviarBubblewhats`.
- Novo aviso **"saiu para entrega"** ao comprador, disparado em 3 pontos que
  hoje só atualizam o banco sem notificar:
  - `src/app/api/webhooks/uber-direct/route.ts` (status `EmTransito` vindo do
    Uber Direct)
  - `atualizarStatusCorrida` em `src/app/(parceiro)/parceiro/actions.ts`
  - `atualizarStatusRota`/ações equivalentes em
    `src/app/(afiliado)/afiliado/logistica/actions.ts`
  (ambas as ações manuais dão o mesmo passo "Iniciar trânsito" → `EmTransito`)
- Novos avisos de **disputa/troca/devolução**, todos via BubbleWhats:
  - `abrirDisputa` (`src/app/pedido/[id]/disputa/actions.ts`) → avisa a loja
  - `proporResolucao` (`src/app/(seller)/seller/disputas/actions.ts`) → avisa o
    comprador que a loja propôs uma resolução (troca/devolução/reembolso)
  - `decidirDisputa` (`src/app/(admin)/admin/disputas/actions.ts`) → avisa
    comprador e loja da decisão final da mediação
- Templates de texto para os 5 eventos, em `src/lib/bubblewhats.ts`, seguindo o
  estilo dos templates existentes em `src/lib/whatsapp.ts` (`mensagemRota`,
  `mensagemPedidoPagoSeller`): direto, com emoji de contexto, link para
  `/pedido/[id]`.

## Out of Scope

- Qualquer alteração de configuração no painel BubbleWhats (aparelho, webhooks
  cadastrados, plano).
- Persistência de histórico de notificações enviadas (sem tabela/schema
  confirmado — se necessário, é uma change separada).
- Migrar TODOS os usos existentes de `enviarWhatsapp`/Meta para BubbleWhats —
  só os 5 eventos listados acima. `mensagemPedidoPagoSeller` (seller, pedido
  pago) e `mensagemRota` (afiliado, rota atribuída) continuam via Meta.

## Capabilities

### New Capabilities
- `notificacoes-pedido-bubblewhats`: avisos ao comprador (e à loja, quando
  aplicável) sobre saída para entrega e sobre o ciclo de disputa/troca/
  devolução, via BubbleWhats, best-effort (falha de envio nunca bloqueia a
  operação principal).

## Impact

- Arquivos alterados: `src/lib/bubblewhats.ts` (novos templates),
  `src/app/api/asaas/webhook/route.ts`, `src/app/api/webhooks/uber-direct/route.ts`,
  `src/app/(parceiro)/parceiro/actions.ts`,
  `src/app/(afiliado)/afiliado/logistica/actions.ts`,
  `src/app/pedido/[id]/disputa/actions.ts`,
  `src/app/(seller)/seller/disputas/actions.ts`,
  `src/app/(admin)/admin/disputas/actions.ts`.
- Nenhuma migration nova (usa `telefone_contato`/`whatsapp` já existentes em
  `pedidos`/`lojas`).
- Issue de acompanhamento: #350.
