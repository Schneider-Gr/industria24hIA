## Why

PRD 061 (`docs/prds/061-simulador-de-venda-futura-com-curva-e-minimo.md`). Hoje o lote
de venda futura tem um preço fixo (`vendas_futuras.valor`, 0016) e o seller decide
estoque, data e desconto sem base: só existe a sugestão da IA (PRD 011). O comprador paga
na reserva e o dinheiro fica retido até a entrega; não há estorno no sistema. O seller de
safra (exemplo: açaí) quer recompensar quem reserva cedo e só assumir o lote se houver
demanda suficiente.

Verificado no código em 09/10/2026 (master `d8651c4`):

- `checkout_criar_pedido` (vigente na 0207) cobra item de venda futura por
  `coalesce(vendas_futuras.valor, produtos.valor)` e **não aplica** `preco_faixa` nesse
  item; item comum usa `preco_faixa`.
- A reserva na vitrine (`MercadoFuturo.reservar`) só põe o lote no carrinho; o pedido nasce
  no checkout, pago, e baixa `vendas_futuras.estoque`.
- `comissao_pct_produto(uuid)` existe (0189) com `grant execute ... to authenticated`.
- A compra coletiva já tem o modelo de "meta atingida → um pedido por participante → PIX
  com prazo → expira" (`coletiva_fechar`, `coletiva_set_pagamento_ate`,
  `coletiva_expirar_pagamentos`, 0077/0080/0213).
- O cron da venda futura (`/api/venda-futura/avisos/tick`) roda 1× por dia às 13:00 UTC
  (`vercel.json`); o tick da coletiva não está agendado.

## What Changes

**Milestone 1 — curva de desconto e simulador**

- Lote ganha uma **curva de desconto por antecedência**: até 3 degraus
  `{dias_antes, desconto_pct}`.
- Preço da reserva = `preco_faixa(produto, qtd)` × (1 − desconto do degrau vigente na data
  da reserva), arredondado em centavos, nunca acima do preço à vista. Uma função SQL é a
  fonte da verdade; o TypeScript tem uma réplica pura testada, usada pelo simulador.
- `checkout_criar_pedido` passa a usar essa função para item de venda futura **com curva**.
  Lote sem curva continua exatamente como hoje (`valor` fixo, sem faixa de volume).
- Formulário "Nova venda futura" ganha: produção prevista, data de entrega, degraus da curva
  e o **simulador** (matriz faixa de volume × degrau com preço, desconto total e líquido
  depois de `comissao_pct_produto`; receita mínima e máxima do lote).
- Vitrine mostra preço do degrau atual, selo "X% abaixo do à vista" e até quando o degrau
  vale.

**Milestone 2 — mínimo de reservas e cobrança no atingimento**

- Lote ganha `minimo_reservas` e `prazo_minimo`. Lote com mínimo não passa pelo checkout:
  o comprador **reserva sem pagar** (nova entidade de reserva), com o preço travado.
- Ao atingir o mínimo, cada reserva vira um pedido "Aguardando Pagamento" com PIX válido por
  48 h, no molde da coletiva. Quem não paga perde o pedido e a quantidade volta ao lote.
- Prazo vencido sem o mínimo: lote cancelado, reservas canceladas, ninguém cobrado, avisos.

## Capabilities

### New Capabilities
- `venda-futura-curva`: curva de desconto por antecedência, preço da reserva e simulador.
- `venda-futura-minimo`: mínimo de reservas, reserva sem cobrança e cobrança no atingimento.

### Modified Capabilities
- `checkout`: preço do item de venda futura com curva.

## Impact

- Migrations: colunas novas em `vendas_futuras`, função de preço, nova tabela de reservas
  (RLS ligado, escrita só por RPC `security definer`), alteração de `checkout_criar_pedido`.
- Código: `src/lib/venda-futura/` (réplica do preço + matriz), `VendaFuturaForm`,
  `MercadoFuturo`, página do lote/reserva, tick da venda futura, avisos BubbleWhats.
- Não muda: teto do à vista (0211), gate CNPJ/IE (0036), cupom fora de venda futura, entrega
  só com código (0210), repasse só depois da entrega.
