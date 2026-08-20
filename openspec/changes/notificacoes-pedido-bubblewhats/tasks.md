## 1. Templates de mensagem

- [ ] 1.1 `mensagemSaiuParaEntrega({ idVenda, linkPedido })` em `src/lib/bubblewhats.ts`
- [ ] 1.2 `mensagemDisputaAbertaLoja({ idVenda, motivo, linkDisputa })`
- [ ] 1.3 `mensagemPropostaResolucaoComprador({ idVenda, proposta, linkDisputa })`
- [ ] 1.4 `mensagemDecisaoDisputa({ idVenda, decisao, destinatario: "comprador" | "loja", linkDisputa })`
- [ ] 1.5 `src/lib/bubblewhats.test.ts`: um teste por template (formato da string,
      sem depender de rede)

## 2. Migrar código de entrega para BubbleWhats

- [ ] 2.1 `src/app/api/asaas/webhook/route.ts`: trocar a chamada de
      `enviarWhatsapp(telComprador, mensagemCodigoComprador(...))` para
      `enviarBubblewhats`, mantendo o texto de `mensagemCodigoComprador`
      (import de `whatsapp.ts` ou duplicar template — decidir no PR conforme
      o que ficar mais lazy sem duplicar lógica)

## 3. Aviso "saiu para entrega"

- [ ] 3.1 `src/app/api/webhooks/uber-direct/route.ts`: ao mapear status para
      `EmTransito`, buscar telefone do comprador do pedido vinculado à rota e
      enviar `mensagemSaiuParaEntrega` (best-effort, não bloquear a
      atualização do banco em caso de falha de envio)
- [ ] 3.2 `atualizarStatusCorrida` em `src/app/(parceiro)/parceiro/actions.ts`:
      mesmo aviso quando `status === "EmTransito"`
- [ ] 3.3 Ação equivalente em `src/app/(afiliado)/afiliado/logistica/actions.ts`
      (`STATUS_VALIDOS`/transição para `EmTransito`)

## 4. Avisos de disputa/troca/devolução

- [ ] 4.1 `abrirDisputa` (`src/app/pedido/[id]/disputa/actions.ts`): avisar a
      loja (telefone de `lojas.whatsapp`, mesmo campo usado em
      `mensagemPedidoPagoSeller`)
- [ ] 4.2 `proporResolucao` (`src/app/(seller)/seller/disputas/actions.ts`):
      avisar o comprador da proposta de resolução
- [ ] 4.3 `decidirDisputa` (`src/app/(admin)/admin/disputas/actions.ts`):
      avisar comprador e loja da decisão final

## 5. Fechamento

- [ ] 5.1 Teste manual em preview de pelo menos 1 dos 5 eventos ponta a ponta
      (mesmo padrão usado no teste do PR #349: rota de debug temporária,
      removida antes do merge)
- [ ] 5.2 Abrir PR referenciando `Closes #350`
- [ ] 5.3 Após merge, arquivar esta change
