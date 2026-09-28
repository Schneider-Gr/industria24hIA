## 1. Banco

- [ ] 1.1 Migration (número pelo `scripts/proximo-migration.sh`): `cotacoes_frete_vendedor` com RLS e view `cotacoes_frete_seller` (D1); `lojas.entrega_a_combinar` com guarda em `guard_campos_restritos`, a partir da versão vigente em produção; `produtos.frete_a_combinar` com `check (not (frete_a_combinar and frete_gratis))`; `linha_itens.cotacao_vendedor_id` (D11)
- [ ] 1.2 `cotacao_status_efetivo` (D2) e `cotacao_itens_chave` (D6)
- [ ] 1.3 RPC `solicitar_cotacao_frete` (D7): usuário logado, não dono, itens aprovados e com frete a combinar, flag da loja, observação, 10/h, substituição
- [ ] 1.4 RPC `responder_cotacao_frete` (D8) e `cancelar_cotacao_frete` (comprador)
- [ ] 1.5 Nova versão de `checkout_criar_pedido(itens, entrega, forma_pagamento)` com a cotação por envio e "tudo com o vendedor" (D10), e do overload `frete_consolidado`, a partir da definição vigente em produção (depois da #808, se ela já estiver aplicada)
- [ ] 1.5b `cotar_envios_tabela` (#808, se aplicada), `cotar_frete_tabela`, `cotar_frete_interno`, cotação Uber Direct e entrega por km do afiliado ignoram item com `frete_a_combinar` (D4)
- [ ] 1.6 Teste em `begin … rollback` contra produção com os casos do Migration Plan e regressão sem as flags
- [ ] 1.7 Tipos em `database.types.ts`
- [ ] 1.8 Aplicar em produção com confirmação da dona e conferir com `db query`

## 2. Regras em `src/lib/cotacao-frete/` (teste antes)

- [ ] 2.1 Validação da observação (telefone, e-mail, Pix, link)
- [ ] 2.2 Status efetivo, chave dos itens e casamento cotação × envio
- [ ] 2.3 Decisão de exibir na PDP (flag, produto marcado, região ou UF de origem) e separação dos itens a combinar em envio próprio
- [ ] 2.4 Textos de valor e prazo ("Frete grátis combinado com o vendedor", "de X a Y dias úteis", validade)

## 3. Comprador

- [ ] 3.1 PDP: bloco "Entrega a combinar", estado da cotação existente, formulário de pedido com login e CEP
- [ ] 3.2 `cotar-frete/route.ts` e `opcoes-frete.ts`: itens com frete a combinar fora do cálculo da loja, em envio próprio com a opção `a_combinar` (cotação válida que casa ou pedido de cotação)
- [ ] 3.3 `checkout/page.tsx`: "Pedir cotação" dos itens a combinar, "Frete combinado com o vendedor", "Tudo com o vendedor"
- [ ] 3.4 `schemas.ts` e `checkout/actions.ts`: `cotacao_vendedor_id` e `tudo_com_vendedor`; trata "A cotação do frete mudou ou venceu" recotando
- [ ] 3.5 Cancelamento do pedido antes do pagamento devolve a cotação a respondida

## 4. Seller e admin

- [ ] 4.1 `/seller/cotacoes-frete`: lista com contador no menu, detalhe e resposta (valor, prazo, valor do carrinho inteiro, recusa, confirmação acima de 50%)
- [ ] 4.2 Cadastro do produto: "Frete a combinar" ao lado de "Frete grátis" (trava o frete grátis); avião desativado na linha do produto em `/seller/produtos`
- [ ] 4.3 Admin: ligar e desligar a flag por loja, com aviso de que o frete ainda não entra no repasse (PRD 052)

## 5. Avisos e agendador

- [ ] 5.1 Aviso ao seller no pedido (e-mail + BubbleWhats + painel) e ao comprador na resposta e na recusa (D12)
- [ ] 5.2 `/api/cotacoes-frete/tick` com `CRON_SECRET`: lembrete de 12 h e aviso de expiração, idempotentes
- [ ] 5.3 `.github/workflows/cotacoes-frete-tick.yml` de hora em hora; `CRON_SECRET` nos segredos do repositório (comando para a dona)

## 6. Entrega

- [ ] 6.1 `npm run lint`, `npm run build`, `npm run test`
- [ ] 6.2 Verificação no navegador com loja de teste com a flag: PDP, pedido, resposta, checkout misto, pedido pago com o frete cotado, expiração; e loja sem a flag sem mudança
- [ ] 6.3 PR com `Closes #<issue>`, migration aplicada antes do merge, deploy conferido em produção

## 7. Milestone 2 (fora desta change, registrado para não se perder)

- [ ] 7.1 Resposta pelo WhatsApp com o Jev (US05): depende de template aprovado na Meta Cloud API para o aviso ao seller, porque a BubbleWhats não devolve a resposta ao app
