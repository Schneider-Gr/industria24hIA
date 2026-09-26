## 1. Banco

- [ ] 1.1 Migration (número pelo `scripts/proximo-migration.sh`): `lojas.frete_tabela_checkout`, `lojas.dias_para_postar`; `linha_itens.envio_ref`, `frete_prazo_min`, `frete_prazo_max`; guarda da flag em `guard_campos_restritos`
- [ ] 1.2 `cep_origem_produto(produto_id)` com os casos do D10 da change anterior
- [ ] 1.3 RPC `cotar_envios_tabela` (D1, D3, D4)
- [ ] 1.4 Nova versão de `checkout_criar_pedido(itens, entrega, forma_pagamento)` com o ramo de envios (D6) e do overload `frete_consolidado` (D7), a partir da definição vigente em produção
- [ ] 1.5 Desativar "Entrega Rápida I24" com guarda de 0 itens (D11)
- [ ] 1.6 Teste em `begin … rollback` contra produção: casos numéricos do PRD 049, carrinho misto, global não ativada e encerrada, escolha que sumiu, e regressão sem flag (percentual, Uber Direct, cupom, consolidado, venda futura)
- [ ] 1.7 Tipos em `database.types.ts`
- [ ] 1.8 Aplicar em produção com confirmação da dona e conferir com `db query`

## 2. Regras em `src/lib/checkout/` (teste antes)

- [ ] 2.1 Montagem das opções por envio: ordem por valor, pré-seleção, selo "mais rápida", manter escolha, aviso de troca
- [ ] 2.2 Texto do prazo ("de X a Y dias úteis", "prazo a combinar")
- [ ] 2.3 Schema de `entrega.envios` em `schemas.ts`

## 3. Checkout

- [ ] 3.1 `cotar-frete/route.ts`: loja com flag e tabela ativa chama `cotar_envios_tabela` com os itens; demais seguem o caminho atual
- [ ] 3.2 `checkout/page.tsx`: envios com produtos, opções, selo, total por soma; consolidado escondido quando todos os envios são de tabela
- [ ] 3.3 `checkout/actions.ts`: envia `envios` e trata "O frete mudou" recotando

## 4. Seller e admin

- [ ] 4.1 Minha Loja: dias úteis para postar
- [ ] 4.2 Admin: ligar e desligar a flag por loja, com aviso de que o pós-venda (M3), o PRD 052 e o PRD 050 ainda não estão prontos

## 5. Entrega

- [ ] 5.1 `npm run lint`, `npm run build`, `npm run test`
- [ ] 5.2 Verificação no navegador com loja de teste com a flag e loja sem a flag
- [ ] 5.3 PR com `Closes #<issue>`, migration aplicada antes do merge, deploy conferido em produção
