## 1. Banco

- [x] 1.1 Migration `0203_entrega_a_combinar.sql`: `cotacoes_frete_vendedor` com RLS de leitura (comprador, dono da loja, admin; sem view separada: o painel não mostra comprador); `lojas.entrega_a_combinar` com guarda em `guard_campos_restritos` a partir da versão vigente em produção; `produtos.frete_a_combinar` com `check (not (frete_a_combinar and frete_gratis))`; `linha_itens.cotacao_vendedor_id` (D11)
- [x] 1.2 `cotacao_status_efetivo` (D2), `cotacao_itens_chave` (D6) e `cotacao_observacao_tem_contato` (D7)
- [x] 1.3 RPC `solicitar_cotacao_frete` (D7): usuário logado, não dono, itens aprovados e com frete a combinar, flag da loja, observação, 10/h, faixa de CEP do produto, substituição
- [x] 1.4 RPC `responder_cotacao_frete` (D8) e `cancelar_cotacao_frete` (comprador); `cotacao_frete_para_checkout` para a rota do checkout; `entrega_a_combinar_info` para a PDP (lojas não tem leitura pública)
- [x] 1.5 Nova versão de `checkout_criar_pedido(itens, entrega, forma_pagamento)` a partir da definição de produção: item com frete a combinar só sai com entrega pela cotação; cotação conferida (comprador, loja, CEP, itens × quantidades, validade), "tudo com o vendedor", marca `usada`; overload `frete_consolidado` ignora linha com `cotacao_vendedor_id`
- [x] 1.5b Outros fretes desativados para o item marcado: o banco recusa entrega sem cotação (vale para tabela, percentual, Uber Direct e km); o checkout nem cota esses itens pelo caminho normal
- [x] 1.6 Teste em `begin … rollback` contra produção: 23 casos (flag só admin, grátis + combinar barrado, observação com telefone, produto sem opção, CEP fora da faixa, dono pedindo, frete alto pede confirmação, resposta dupla, quantidade e CEP diferentes, R$ 35 com consolidado ignorado, cotação usada não repete, cancelado devolve, tudo com o vendedor R$ 40, retirada, regressão do percentual igual à função atual)
- [x] 1.7 Tipos em `database.types.ts` (colunas e tabela novas, editados à mão até regenerar depois de aplicar)
- [ ] 1.8 Aplicar em produção com confirmação da dona e conferir com `db query`

## 2. Regras em `src/lib/catalogo-compra/cotacao-frete.ts` (teste antes)

- [x] 2.1 Validação da observação (telefone, e-mail, Pix, link), espelho da função SQL
- [x] 2.2 Status efetivo; chave e casamento ficam no SQL (fonte única)
- [x] 2.3 Decisão de exibir na PDP (flag, produto marcado, região ou UF de origem) e separação dos itens a combinar em grupo próprio (`agruparItensPorLoja`, `juntarTudoComVendedor`)
- [x] 2.4 Textos de valor e prazo ("Frete grátis combinado com o vendedor", "de X a Y dias úteis", validade)

## 3. Comprador

- [x] 3.1 PDP: `EntregaACombinar` com estado da cotação lido no client (página pública e cacheada), pedido com login e CEP, cancelamento
- [x] 3.2 `cotar-frete/route.ts` e `opcoes-frete.ts`: grupo a combinar devolve só a opção `a_combinar` (e "tudo com o vendedor") da cotação válida que casa
- [x] 3.3 `checkout/page.tsx`: grupo "Frete combinado com o vendedor", pedido de cotação dos itens a combinar, escolha "tudo com o vendedor", bloqueio sem cotação
- [x] 3.4 `schemas.ts`, `montagem-pedido.ts` e `checkout/actions.ts`: `frete_a_combinar` lido do banco, pedido próprio por loja, `cotacao_vendedor_id` e `tudo_com_vendedor`
- [x] 3.5 Pedido cancelado antes do pagamento devolve a cotação (aceita `usada` com pedido `Cancelado`)

## 4. Seller e admin

- [x] 4.1 `/seller/cotacoes-frete`: lista com contador no menu, detalhe e resposta (valor, prazo, valor do carrinho inteiro, recusa, confirmação acima de 50%)
- [x] 4.2 Cadastro do produto: "Frete a combinar" ao lado de "Frete grátis" (trava o grátis), só em loja com a flag; avião desativado na linha do produto
- [x] 4.3 Admin: ligar e desligar a flag na tela da loja, com aviso do PRD 052

## 5. Avisos e agendador

- [x] 5.1 Aviso ao seller no pedido (e-mail + BubbleWhats, com link) e ao comprador na resposta, na recusa e na expiração (D12)
- [x] 5.2 `/api/cotacoes-frete/tick` com `CRON_SECRET`: lembrete de 12 h e aviso de expiração, idempotentes
- [x] 5.3 `.github/workflows/cotacoes-frete-tick.yml` de hora em hora
- [ ] 5.4 `CRON_SECRET` nos segredos do repositório (comando para a dona)

## 6. Entrega

- [ ] 6.1 `npm run lint`, `npm run build`, `npm run test`
- [ ] 6.2 Verificação no navegador com loja de teste com a flag: PDP, pedido, resposta, checkout misto, pedido pago com o frete cotado, expiração; e loja sem a flag sem mudança
- [ ] 6.3 PR com `Closes #<issue>`, migration aplicada antes do merge, deploy conferido em produção

## 7. Milestone 2 (fora desta change, registrado para não se perder)

- [ ] 7.1 Resposta pelo WhatsApp com o Jev (US05): depende de template aprovado na Meta Cloud API para o aviso ao seller, porque a BubbleWhats não devolve a resposta ao app
