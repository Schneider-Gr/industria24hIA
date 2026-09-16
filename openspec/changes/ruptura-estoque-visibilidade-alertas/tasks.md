## 1. Banco

- [x] 1.1 Migration `0173_produtos_vendaveis.sql`: views `produtos_vendaveis` e `produtos_em_ruptura` (`security_barrier`, grant para `anon, authenticated`) + índice parcial em `vendas_futuras`
- [x] 1.2 Testada em `begin; … rollback;` antes de aplicar (111 vendáveis de 115 aprovados)
- [x] 1.3 Aplicada em produção e conferida: `produtos_vendaveis` = 111, `produtos_em_ruptura` = 4
- [x] 1.4 Migration `0174_alertas_enviados.sql`: idempotência dos cron, RLS ligada sem policy
- [x] 1.5 `database.types.ts` com as duas views e a tabela nova (adição cirúrgica, sem arrastar o drift do schema)

## 2. Vitrine

- [x] 2.1 `idsEmRuptura()` em `src/lib/catalogo-compra/ruptura.ts` — regra única, lida da view
- [x] 2.2 Filtro aplicado em home (recentes, ofertas, supermercado), busca, prévia de busca, categoria, loja, feed de produtos e cross-sell do carrinho
- [x] 2.3 Checkout, pedidos, disputas, mensagens, seller e admin continuam lendo `produtos`
- [ ] 2.4 Selo "reserva" no card do produto esgotado com venda futura (hoje o card já mostra a flag de venda futura de `vitrine-quick-flags.ts`)

## 3. Página do produto

- [x] 3.1 Estado derivado: sem saldo à vista + com/sem reserva
- [x] 3.2 Badge de estoque vira "Sem estoque no momento" ou "compre por reserva" com âncora para o bloco de venda futura
- [x] 3.3 Rota continua acessível; `schema.org` passa a `PreOrder` quando só há reserva
- [x] 3.4 **Causa raiz do incidente**: `semEstoque` no `BotaoAddCarrinho` nunca era verdadeiro — `Math.max(minimo, estoqueMaximo)` elevava o máximo ao mínimo, e o botão seguia ativo com estoque 0

## 4. Carrinho e checkout

- [x] 4.1 `carregarTravasMinimas` passa a trazer o saldo real (à vista + reserva) por produto
- [x] 4.2 `avaliarDisponibilidade` em `src/lib/carrinho/disponibilidade.ts` + teste (Red → Green)
- [x] 4.3 Carrinho marca o item indisponível, oferece ajustar quantidade, ver reserva ou remover, e trava o fechamento da loja afetada (o fechamento parcial já existente segue com as demais)
- [x] 4.4 Checkout continua com a RPC como barreira final

## 5. Painel do seller

- [x] 5.1 `estadoEstoque` / `foraDaVitrine` / `vendendoPorReserva` em `src/lib/seller/estoque-estado.ts` + teste
- [x] 5.2 `ProdutoLinha` mostra o estado e distingue "fora da vitrine" de "vendendo por reserva"
- [x] 5.3 Filtro por estado de estoque na lista de produtos
- [x] 5.4 KPI novo e aviso com a saída (repor ou criar venda futura); dashboard e sidebar passam a contar só o que saiu da vitrine
- [ ] 5.5 Aviso no topo do formulário de edição do produto (hoje o aviso está na lista, não dentro do form)

## 6. Alertas

- [x] 6.1 `templateEstoqueRuptura` em `src/lib/email.ts`
- [x] 6.2 Rota `/api/estoque/alerta/tick` (GET do cron + POST manual, `registrarEvento`, agrupado por loja)
- [x] 6.3 Supressão de repetido por `alertas_enviados`, com janela de 7 dias
- [x] 6.4 Templates de WhatsApp da venda futura (comprador e seller, véspera e dia) em `src/lib/bubblewhats.ts`
- [x] 6.5 `marcoDoDia` / `hojeManaus` em `src/lib/venda-futura/avisos.ts` + teste (fuso de Manaus, virada de mês)
- [x] 6.6 Rota `/api/venda-futura/avisos/tick`
- [x] 6.7 Três entradas de cron em `vercel.json`

## 7. Verificação

- [x] 7.1 `npm run test` — 257 passam, 1 skip
- [x] 7.2 `tsc --noEmit` limpo
- [x] 7.3 `npm run lint` — 0 erros, 24 avisos pré-existentes
- [x] 7.4 `npm run build` limpo, com as duas rotas novas
- [x] 7.5 Numeração de migration sem colisão (`git log --all` ia até 0172)
- [ ] 7.6 QA em produção depois do deploy: conferir que os 4 produtos em ruptura sumiram da vitrine e os 46 com reserva permaneceram

## 8. Fechamento

- [ ] 8.1 Issue + PR referenciando esta spec e o PRD 038
- [ ] 8.2 `openspec archive ruptura-estoque-visibilidade-alertas` após merge
