## 1. Migration (caminho do dinheiro)

- [x] 1.1 Checar colisão de número de migration em todas as branches
- [x] 1.2 `repasses_recalcular_pedido`: trocar `sum(li.repasse_vendedor)` por
      `sum(coalesce(li.repasse_vendedor, li.valor - coalesce(li.repasse_ind,0)
      - coalesce(li.repasse_afiliado,0)))`
- [x] 1.3 RPC `repasse_solicitar_pedido(p_pedido_id uuid)`: valida dono da loja,
      pedido pago e **entrega confirmada em todo item** (gate do Bubble,
      confirmado em vídeo), chama o recálculo
- [x] 1.4 Grants: `authenticated` executa a RPC; `revoke` de `public`/`anon`
- [x] 1.5 Testar a migration inteira em `begin; ... select <verificação>;
      rollback;` contra produção — pegou o `42P10` do `ON CONFLICT`
- [x] 1.6 Conferir o valor derivado contra uma amostra de pedidos reais antes de
      qualquer transferência ser disparada por ele — 276/293 legadas batem, e o
      pedido B21EC13B43 fecha exato: 0,26 plataforma + 0,26 afiliado + 4,58
      seller = 5,10
- [x] 1.7 `ON CONFLICT` com o predicado dos índices parciais da 0147

## 2. Server action

- [x] 2.1 `solicitarRepasse` em `seller/pedidos/actions.ts`, chamando a RPC e
      depois o mesmo caminho de `lib/repasses.ts`
- [x] 2.2 Erro de negócio exibido ao seller sem virar "React error #441": o
      `throw` da action é capturado no cliente por `SolicitarRepasse`, mesmo
      padrão já usado por `CancelarPedido`
- [ ] 2.3 Teste do gate: pedido não pago e pedido de outra loja são rejeitados

## 3. Tela de pedidos (paridade Bubble)

- [ ] 3.1 Coluna Dt Pagamento (`pedidos.dt_pagamento`)
- [ ] 3.2 Status combinado com `forma_pagamento`
- [ ] 3.3 Filtros "Pago e Entregue" e "Pago e não entregue"
- [ ] 3.4 Data e hora na coluna Entregue (`linha_itens.data_entrega`)
- [ ] 3.5 Dados de entrega do item (endereço + contato), com caso de retirada
- [x] 3.6 Botão "Solicitar repasse" no bloco do pedido, visível só com todo
      item entregue e algum item ainda não transferido; o estado por item
      ("Transferência realizada"/"Aguardando") já existia

## 4. Verificação

- [x] 4.1 `npm run lint` (0 erros) e `tsc --noEmit` (limpo), binário local
- [ ] 4.2 QA no preview contra dados de produção: um pedido do Bubble e um
      pedido novo, conferindo o valor do repasse dos dois
