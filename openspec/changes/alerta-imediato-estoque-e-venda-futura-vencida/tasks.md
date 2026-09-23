## 1. Alerta imediato de estoque crítico

- [ ] 1.1 `mensagemEstoqueCriticoSeller` em `src/lib/bubblewhats.ts` e
      `templateEstoqueCriticoImediato` em `src/lib/email.ts`, com teste do texto
- [ ] 1.2 `alertarEstoqueCriticoDoPedido(svc, pedidoId)`: lê os itens do pedido,
      calcula o estado com `estadoEstoque()`, mantém só quem **mudou de estado**
      por causa deste pedido (saldo antes = saldo atual + quantidade vendida),
      agrupa num aviso só
- [ ] 1.3 Idempotência e teto: chave em `alertas_enviados`
      (`estoque-imediato:<pedido>`), e contagem do dia por loja para o teto de 5
- [ ] 1.4 Enxerto em `src/lib/asaas-confirmar.ts` após a confirmação, dentro de
      try/catch com Sentry — falha nunca derruba o pagamento
- [ ] 1.5 Teste unitário da seleção: só mudou de estado, agrupamento, venda
      futura fora, loja sem WhatsApp cai só no e-mail

## 2. Venda futura vencida

- [ ] 2.1 Marco `vencido` em `marcoDoDia` (previsão = ontem), com teste cobrindo
      véspera, no dia, vencido e datas antigas que não devem redisparar
- [ ] 2.2 `mensagemVendaFuturaSellerVencida` e aviso ao admin
- [ ] 2.3 Ligar o marco no cron `/api/venda-futura/avisos/tick`, reusando a
      idempotência por item + marco que já existe

## 3. Fila de atrasadas no admin

- [ ] 3.1 Tela listando item, pedido, loja, comprador, previsão e dias de atraso,
      ordenada pelo maior atraso, com item entregue e pedido cancelado fora
- [ ] 3.2 Entrada no menu do admin

## 4. Verificação

- [ ] 4.1 `tsc`, `eslint` e `next build` verdes
- [ ] 4.2 Testes unitários passando
- [ ] 4.3 Conferir em produção após o deploy
