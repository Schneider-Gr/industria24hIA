## Why

O PRD 008 (`docs/prds/008-frete-uber-direct-fallback.md`) previa que o comprador visse e escolhesse uma entrega Uber Direct no checkout quando nenhuma transportadora interna cobre o CEP. O que existia em produção desde 03/08 (Milestone 2 do PRD) era diferente: o despacho só rodava depois do pagamento, silenciosamente, e o gatilho ("nenhuma corrida foi criada") quase nunca disparava porque `despachar_corrida_automatica` sempre publica a corrida no pool geral — o fallback estava praticamente morto em produção, e o seller não tinha nenhum painel para ver a entrega. Este change fecha o Milestone 1 do PRD: cotação real no checkout, sinal explícito de despacho, e visibilidade para o seller.

**Nota de status:** este change documenta trabalho já implementado nesta sessão (código escrito e testado localmente), não uma proposta a implementar — `tasks.md` reflete isso.

## What Changes

- Uber Direct entra como uma `transportadora` (`fonte='uber_direct'`), reaproveitando o mecanismo já em produção desde a migration `0099_transportadoras.sql`/PR #207, em vez da cascata backend originalmente desenhada no PRD.
- Nova rota `POST /api/checkout/cotar-frete`: cota frete interno (via nova RPC `cotar_frete_interno`) e, só quando nenhuma transportadora interna cobre o CEP, cota Uber Direct de verdade e grava a cotação em `cotacoes_frete_externo`.
- `checkout_criar_pedido` (RPC) ganha parâmetro `p_cotacao_externa_id`: quando a transportadora é `uber_direct`, usa o valor da cotação salva (nunca um número vindo do client) e pula o match de `faixas_cep`.
- Checkout (`src/app/checkout/page.tsx`, `actions.ts`) cota frete real por loja (cada grupo de itens de uma loja vira um pedido próprio) em vez da estimativa flat de 10%, e bloqueia "Continuar" quando não há nenhuma opção de frete para o CEP.
- Webhook de pagamento (`src/app/api/asaas/webhook/route.ts`): troca o sinal de despacho Uber Direct pós-pagamento de heurístico ("nenhuma corrida foi criada", que quase nunca disparava) para explícito (`linha_itens.transportadora_id` aponta para a transportadora Uber Direct) — quando esse sinal está presente, pula a corrida automática (não publica corrida fantasma no pool para um pedido que já vai de Uber Direct).
- Novo painel `/seller/entregas`: seller passa a ver as `corridas` (despacho automático interno) e as entregas Uber Direct (`rotas.uber_status`/`uber_tracking_url`) dos próprios pedidos — RLS liberada por `corridas_seller_read` (antes só comprador/parceiro/admin liam `corridas`).
- Correção de documentação (não de código, pendência operacional): o header de assinatura do webhook Uber Direct (`x-uber-signature`) estava certo, mas a chave configurada (`UBER_DIRECT_WEBHOOK_SIGNING_KEY`) é uma cópia do `client_secret` — a Uber gera uma Webhook Signing Key dedicada por endpoint, obtida no painel. Comentário do código atualizado com o achado; troca do valor real é ação humana (painel Uber Direct), fora do escopo deste change.

**Fora do escopo (não implementado, dependências externas):**
- Reembolso Uber Direct: API separada, exige acordo comercial com a Uber; o contrato real (endpoint, formato do valor, enum de motivos) não pôde ser confirmado nesta sessão contra a doc oficial (SPA sem conteúdo acessível via fetch) — não foi codado para não inventar contrato de API externa.
- Split de frete por loja já é suportado (frente principal deste change), mas a UI ainda usa a loja do primeiro grupo do carrinho para a estimativa flat de fallback quando a cotação real ainda não voltou — limitação pré-existente da estimativa antiga, não introduzida aqui.

## Capabilities

### New Capabilities
- `checkout/frete-uber-direct`: cotação e seleção de frete Uber Direct no checkout como fallback de cobertura, incluindo o parâmetro de cotação externa do RPC de criação de pedido.
- `logistica/seller-entregas`: visibilidade do seller sobre corridas automáticas e entregas Uber Direct dos próprios pedidos.

### Modified Capabilities
(nenhuma — não existe spec formal prévia para checkout ou para o painel do seller nesta capability; ver Impact para o código existente alterado.)

## Impact

- `supabase/migrations/0139_uber_direct_transportadora.sql`, `0140_checkout_cotacao_uber_direct.sql`, `0141_corridas_seller_read.sql`.
- `src/app/api/checkout/cotar-frete/route.ts` (novo), `src/lib/checkout/opcoes-frete.ts` + `.test.ts` (novo).
- `src/app/checkout/page.tsx`, `src/app/checkout/actions.ts`.
- `src/app/api/asaas/webhook/route.ts` (sinal explícito de despacho Uber Direct).
- `src/app/api/webhooks/uber-direct/route.ts` (comentário sobre a chave de assinatura errada).
- `src/app/(seller)/seller/entregas/page.tsx` (novo), `src/components/seller/Sidebar.tsx` (novo item de navegação).
- Depende de `src/lib/uber-direct.ts` (já existente, sem alteração) e da conta/credenciais Uber Direct já provisionadas (PRD 008 §10.1).
