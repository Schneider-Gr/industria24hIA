## 1. Templates de mensagem

- [x] 1.1 `mensagemSaiuParaEntrega({ idVenda, linkPedido })` em `src/lib/bubblewhats.ts`
- [x] 1.2 `mensagemDisputaAbertaLoja({ idVenda, motivo, linkDisputa })`
- [x] 1.3 `mensagemPropostaResolucaoComprador({ idVenda, proposta, linkDisputa })`
- [x] 1.4 `mensagemDecisaoDisputa({ idVenda, decisao, destinatario: "comprador" | "loja", linkDisputa })`
- [x] 1.5 `src/lib/bubblewhats.test.ts`: um teste por template (formato da string,
      sem depender de rede)

## 2. Migrar código de entrega para BubbleWhats

- [x] 2.1 `src/app/api/asaas/webhook/route.ts`: trocar a chamada de
      `enviarWhatsapp(telComprador, mensagemCodigoComprador(...))` para
      `enviarBubblewhats`, mantendo o texto de `mensagemCodigoComprador`
      (import de `whatsapp.ts` ou duplicar template — decidir no PR conforme
      o que ficar mais lazy sem duplicar lógica)

## 3. Aviso "saiu para entrega"

- [x] 3.1 `src/app/api/webhooks/uber-direct/route.ts`: ao mapear status para
      `EmTransito`, buscar telefone do comprador do pedido vinculado à rota e
      enviar `mensagemSaiuParaEntrega` (best-effort, não bloquear a
      atualização do banco em caso de falha de envio)
- [x] 3.2 `atualizarStatusCorrida` em `src/app/(parceiro)/parceiro/actions.ts`:
      mesmo aviso quando `status === "EmTransito"`
- [x] 3.3 Ação equivalente em `src/app/(afiliado)/afiliado/logistica/actions.ts`
      (`STATUS_VALIDOS`/transição para `EmTransito`)

## 4. Avisos de disputa/troca/devolução

- [x] 4.1 `abrirDisputa` (`src/app/pedido/[id]/disputa/actions.ts`): avisar a
      loja (telefone de `lojas.whatsapp`, mesmo campo usado em
      `mensagemPedidoPagoSeller`)
- [x] 4.2 `proporResolucao` (`src/app/(seller)/seller/disputas/actions.ts`):
      avisar o comprador da proposta de resolução
- [x] 4.3 `decidirDisputa` (`src/app/(admin)/admin/disputas/actions.ts`):
      avisar comprador e loja da decisão final

## 5. Aviso de carrinho abandonado (extensão pós-PR)

- [x] 5.1 `mensagemCarrinhoAbandonado({ itens, linkCarrinho })` em `src/lib/bubblewhats.ts`
- [x] 5.2 `src/app/api/carrinho/abandono/tick/route.ts`: além do e-mail já
      existente, envia WhatsApp best-effort. `carrinhos_abandonados` não tem
      coluna de telefone — reaproveita o fallback já usado no webhook Asaas
      (telefone do pedido mais recente do mesmo `cliente_id`)

## 6. Fechamento

- [x] 6.1 Teste manual em preview de pelo menos 1 dos 5 eventos ponta a ponta
      (mesmo padrão usado no teste do PR #349: rota de debug temporária,
      removida antes do merge) — feito para os 4 templates novos + envio real
      confirmado
- [x] 6.2 Abrir PR referenciando `Closes #350` — PR #351
- [ ] 6.3 Após merge, arquivar esta change
