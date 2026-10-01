## 1. Custódia
- [x] 1.1 Migration: trigger em `entregas` recusa `Entregue` direto em item de venda futura (admin e RPCs com código passam)
- [x] 1.2 Testar em `begin … rollback` como seller (recusa) e via `pedido_confirmar_entrega` (aceita); aplicar em prod
- [x] 1.3 Mensagem clara no checkbox do seller quando recusado

## 2. Avisos
- [x] 2.1 Templates de reserva confirmada (comprador e seller) em `bubblewhats.ts`
- [x] 2.2 `notificarPagamento`: pedido com venda futura usa os templates novos pelo BubbleWhats
- [x] 2.3 Tick: filtrar pedido pago e entrega em `entregas`

## 3. Ícone
- [x] 3.1 Ícone de venda futura em `/seller/pedidos`, `/meus-pedidos` e `/admin/pedidos`

## 4. Verificação
- [x] 4.1 tsc, vitest, build
- [ ] 4.2 Compra teste de venda futura com cartão de teste: WhatsApp no pagamento, código, entrega, repasse
