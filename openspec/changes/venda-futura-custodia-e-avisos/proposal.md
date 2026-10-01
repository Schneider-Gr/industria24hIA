## Why

A venda futura promete ao comprador que o pagamento fica retido na plataforma
até a entrega. O caminho do dinheiro já segue essa ideia (Asaas cobra na conta
da plataforma; `repasse_solicitar_pedido` só libera o PIX com todos os itens
entregues), mas a prova de entrega é autodeclarada: a policy
`entregas_seller_all` deixa o dono da loja gravar `entregas.status = 'Entregue'`
pelo checkbox do painel, sem o código do comprador. Numa reserva para daqui a
45 dias o seller marca entregue hoje, clica em "Solicitar repasse" e recebe
antes de produzir. Revisão de 01/10/2026 em produção.

Os avisos também têm buracos:

- Na compra, comprador e seller recebem o aviso genérico de pedido pago. Nada
  diz que é uma reserva, qual é a data do lote, nem que o dinheiro fica retido.
  O aviso do seller sai pela Meta Cloud API (`enviarWhatsapp`), que vira no-op
  sem credencial, enquanto os avisos de reserva usam BubbleWhats.
- O cron `api/venda-futura/avisos/tick` (véspera, no dia, vencido) seleciona
  todo `linha_itens` com `venda_futura_id` sem filtrar o status do pedido e lê
  a flag legada `linha_itens.entregue` em vez de `entregas`. Pedido cancelado
  ou nunca pago recebe "sua reserva chega amanhã"; item já entregue também.

E os pedidos não destacam que são venda futura: só o detalhe do item no painel
do seller mostra a tag, a lista de pedidos do seller, `meus-pedidos` e o admin
não mostram nada.

## What Changes

- **Entrega de item de venda futura só vale com o código do comprador.** Trigger
  em `entregas` recusa a transição para `Entregue` de linha com
  `venda_futura_id` quando a escrita vem direto do cliente (seller ou afiliado
  logístico), salvo admin. As RPCs `pedido_confirmar_entrega` e
  `pedido_confirmar_entrega_publico` (security definer, exigem o código) seguem
  funcionando. Sem a entrega, `repasse_solicitar_pedido` já recusa o repasse.
- **WhatsApp de reserva confirmada no pagamento**, para comprador e seller, pelo
  BubbleWhats: produto, quantidade, data prevista e o aviso de que o pagamento
  fica retido até a entrega com código. Substitui o aviso genérico só nos
  pedidos com item de venda futura; o comprador continua recebendo o código.
- **Cron de avisos corrigido**: só pedido pago (`Pagamento Realizado`,
  `Em Separação`, `Enviado`) e item sem entrega confirmada em `entregas`.
  Mantém a véspera (2 dias antes) e o dia da entrega para os dois lados.
- **Ícone de venda futura** na lista de pedidos do seller, em `meus-pedidos` e
  no admin, reaproveitando `IconeVendaFutura`.

## Out of scope

- Prazo de disputa antes do PIX (`liberar_em` = entrega + 7 dias): precisa de um
  cron de liberação que não existe. Fica para o PRD `compra-garantida-escrow`.
- Validação de preço/data/duplicata no cadastro da venda futura e checagem de
  `previsao >= hoje` no checkout: achados da mesma revisão, mudança separada.
- Pedido comum (sem venda futura): continua aceitando o checkbox do seller.

## Impact

- Migration nova (trigger em `entregas`), testada em `begin … rollback`.
- `src/lib/asaas-confirmar.ts`, `src/lib/bubblewhats.ts`,
  `src/app/api/venda-futura/avisos/tick/route.ts`, telas de pedidos.
- O seller de venda futura passa a depender do código do comprador para
  receber; o checkbox mostra o motivo da recusa.
