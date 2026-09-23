## Why

Levantamento no código em 23/09/2026 mostrou que quase tudo que se supunha
faltar já existe: o seller **já** recebe WhatsApp quando o pedido é pago
(`mensagemPedidoPagoSeller` em `src/lib/asaas-confirmar.ts:255`), o comprador
**já** recebe e-mail em `Pagamento Realizado` e `Cancelado`
(`notificarMudancaStatusPedido`), e comprador e seller **já** recebem WhatsApp
na véspera e no dia da venda futura (`/api/venda-futura/avisos/tick`).

Sobram dois buracos, e os dois custam dinheiro.

**1. Estoque crítico só é sabido no dia seguinte.** A varredura de ruptura roda
às 11h (`/api/estoque/alerta/tick`). Um produto que esgota às 11h05 fica quase
24 horas fora da vitrine sem o seller saber. Em item de giro rápido é um dia
inteiro de venda perdida.

**2. Venda futura vencida é silêncio absoluto.** `marcoDoDia`
(`src/lib/venda-futura/avisos.ts:15`) só conhece `vespera` e `no_dia`. Passada a
data prevista, nada é emitido, nada escalona e nada trava: o item fica pendente
para sempre. Os 82 pedidos fantasma importados do Bubble mostram que "pendente
para sempre" acontece de verdade neste sistema.

## What Changes

- **Alerta imediato de estoque crítico** no fluxo de confirmação de pagamento,
  por WhatsApp e e-mail, somente para produto que **mudou de estado** por causa
  daquele pedido, com um aviso por pedido (nunca um por produto) e teto diário
  por loja.
- **Marco `vencido`** nos avisos de venda futura: no dia seguinte à previsão,
  item não entregue gera aviso ao seller e ao admin, uma única vez por item.
- **Fila de vendas futuras atrasadas** no admin, ordenada por dias de atraso.
- O limiar de crítico **não é novo**: reusa `estadoEstoque()` e
  `produtos.quantidade_minima`, com o padrão de 5 unidades, para que alerta e
  painel do seller nunca discordem.

## What does NOT change

- **Nenhum estorno automático.** Não existe devolução de pagamento no sistema
  (só `repasses.status = 'estornado'`, que é contabilidade interna). O comprador
  de venda futura é obrigatoriamente CNPJ ou produtor rural, o atraso costuma ser
  renegociável, e o dinheiro pode já ter sido repassado ao seller. Estorno vira
  PRD próprio, decidido com dados reais.
- **O comprador não é avisado do atraso** nesta fase: avisar antes de alguém
  poder responder cria disputa que a renegociação resolveria.
- Os avisos que já existem não são reescritos nem migrados para um ponto único
  de notificação agora.

## Impact

- `src/lib/asaas-confirmar.ts` — ponto de enxerto do alerta imediato, já
  best-effort e envolvido em try/catch: falha de aviso nunca pode derrubar uma
  confirmação de pagamento já registrada no Asaas.
- `src/lib/venda-futura/avisos.ts` e `/api/venda-futura/avisos/tick` — marco novo.
- `src/lib/bubblewhats.ts` e `src/lib/email.ts` — mensagens novas.
- `alertas_enviados` (0174) — idempotência por chave, sem tabela nova.
- Admin — tela da fila de atrasadas.
