## 0. Antes de começar
- [ ] 0.1 Dona confirma as premissas do PRD 061 (máx. 3 degraus, multiplicativo, alerta 30%, mínimo contado nas reservas) e a questão do cron de 48 h (design D8)
- [ ] 0.2 Mergear o PR do PRD + esta change (status do PRD para `pronto`)
- [ ] 0.3 Worktree nova a partir de `origin/master`; `scripts/proximo-migration.sh` para os números

## 1. Milestone 1 — curva e simulador
- [ ] 1.1 Red: `src/lib/venda-futura/preco-curva.test.ts` com as fixtures de design D2/D3 (degrau vigente, arredondamento, teto, lote sem curva) e a matriz do açaí
- [ ] 1.2 Green: `preco-curva.ts` (`degrauVigente`, `precoReserva`, `matrizSimulacao`), reaproveitando `precoFaixa`
- [ ] 1.3 Migration: `vendas_futuras.curva jsonb default '[]'`, `producao_prevista int`, trigger de validação da curva
- [ ] 1.4 Migration: `venda_futura_preco(uuid, int, date)`; testar em `begin … rollback` com as mesmas fixtures
- [ ] 1.5 Migration: recriar `checkout_criar_pedido` **a partir da 0207**, trocando o preço do item de venda futura pela função e recusando lote com mínimo; testar em rollback (lote sem curva = valor de hoje)
- [ ] 1.6 `criarVendaFutura` grava curva e produção prevista (zod), mantendo o teto
- [ ] 1.7 `VendaFuturaForm`: campos novos + simulador (server action para faixas e `comissao_pct_produto`), aviso de margem; botão da IA continua
- [ ] 1.8 `MercadoFuturo`: preço do degrau, selo "% abaixo do à vista", validade e "a partir de"
- [ ] 1.9 Aplicar migrations em prod e conferir no schema; tsc, vitest, build; PR, merge e deploy
- [ ] 1.10 Checklist M1 do PRD: simulador = pedido real; teto; preço travado; < 1 s; lote antigo intacto

## 2. Milestone 2 — mínimo e cobrança no atingimento
- [ ] 2.1 Conferir se o Asaas de produção saiu do sandbox
- [ ] 2.2 Migration: `minimo_reservas`, `prazo_minimo`, `status_lote` e tabela `venda_futura_reservas` (RLS ligado, leitura do comprador e do dono da loja, escrita só por RPC)
- [ ] 2.3 RPCs `venda_futura_reservar` e `venda_futura_converter` (montagem do pedido reaproveitada de `coletiva_fechar`, `pagamento_ate` 48 h); testar em rollback
- [ ] 2.4 Tick diário: cancelar lote vencido abaixo do mínimo e expirar pedido não pago em 48 h (decidir D8)
- [ ] 2.5 Avisos BubbleWhats + e-mail: lote garantido (com link de pagamento) e lote cancelado
- [ ] 2.6 Vitrine: barra de progresso, "você só paga se o lote atingir o mínimo", botão Reservar chama a RPC
- [ ] 2.7 Painel do seller: estado do lote e reservas
- [ ] 2.8 Aplicar em prod, conferir no schema; PR, merge e deploy
- [ ] 2.9 Checklist M2 do PRD: sem cobrança antes do mínimo; pedidos com PIX 48 h ao atingir; cancelamento e avisos no prazo

## 3. Comunicação
- [ ] 3.1 Refazer o vídeo da venda futura com as telas reais quando o M1 estiver no ar (o atual é prévia)
