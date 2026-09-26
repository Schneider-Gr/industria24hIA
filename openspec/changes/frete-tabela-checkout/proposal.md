## Why

A change `transportadoras-grandes-volumes` (#795) deixou seller e plataforma cadastrarem transportadoras com faixas reais, mas o comprador não vê nada disso: a cotação manda peso 0 e devolve uma opção só (`cotar_frete_tabela … limit 1`), com o nome genérico "Frete (tabela da transportadora)", e `checkout_criar_pedido` recalcula com `cotar_frete_tabela(v_loja, v_cep, 0)`, ou seja, peso zero e a primeira transportadora, não a escolhida. Esta change é o Milestone 2 do PRD 049 (US04, US05, US06), revisto para a origem no CEP do produto (D10 da change anterior). A US12 (escolha de CD) sai, porque a origem deixou de ser o CD.

Decisões da dona em 25/09/2026: o M2 entra atrás de flag por loja, e a flag só abre em produção quando o M3 (pós-venda do envio), o PRD 052 (frete no repasse) e o PRD 050 (Entrega a combinar) estiverem prontos; o carrinho de uma loja vira envios por CEP de origem e, dentro dele, por transportadora; o frete consolidado (30%) não vale para frete de tabela; loja sem nenhuma entrega usa "Entrega a combinar" (PRD 050).

## What Changes

- Motor de frete por envio no banco, fonte única para a cotação e para o pedido: agrupa os itens por CEP de origem, filtra transportadoras por ativação na loja, categoria, limites de peso, valor e medidas e faixa origem × destino × peso cobrado, e calcula o valor pela fórmula da decisão 10 do PRD 049 (cubagem, kg adicional, AdValorem, taxa fixa, frete mínimo, ICMS por dentro).
- Checkout mostra, por envio, as transportadoras que atendem, com nome, valor e prazo, a mais barata pré-selecionada e o selo "mais rápida"; mostra quais produtos vão em cada envio.
- Prazo exibido = dias úteis para postar da loja (novo campo, padrão 1) + prazo da faixa.
- **BREAKING (só lojas com a flag)**: `checkout_criar_pedido` recebe a transportadora de cada envio, recalcula pelo mesmo motor e grava em `linha_itens` a transportadora, o frete rateado do envio, o prazo e a chave do envio; se a opção escolhida mudou ou sumiu, o pedido não é criado e o checkout recalcula.
- Frete consolidado não se aplica a linha com frete de tabela.
- Cadeia de fontes por envio: tabela; loja sem transportadora de tabela ativa → frete % e Uber Direct como hoje; sem nenhuma opção → "Entrega a combinar" (PRD 050). Até o PRD 050 existir, envio sem opção deixa só a retirada.
- "Entrega Rápida I24" desativada (decisão 16), com guarda de 0 pedidos.
- Flag por loja `lojas.frete_tabela_checkout` (padrão desligado); só o admin liga. Loja sem a flag segue exatamente o caminho de hoje.

Fora desta change: pós-venda do envio (M3: rastreio obrigatório, "Recebi", confirmação automática, "Não recebi", cancelamento por não envio), frete na página do produto (US13), PRD 050, PRD 052, escolha de CD (US12, removida), modal por API.

## Capabilities

### New Capabilities
- `checkout-frete-tabela`: cálculo do frete por envio a partir das faixas, escolha da transportadora pelo comprador e pedido gravado com o valor recalculado.

### Modified Capabilities
- (nenhuma spec existente de checkout descreve o frete; o fallback do PRD 008 continua valendo para loja sem flag e para loja sem transportadora de tabela ativa)

## Impact

- Migration nova (número pelo `scripts/proximo-migration.sh`): `lojas.frete_tabela_checkout`, `lojas.dias_para_postar`; `linha_itens.envio_ref`, `frete_prazo_min`, `frete_prazo_max`; RPC `cotar_envios_tabela`; nova versão de `checkout_criar_pedido(itens, entrega, forma_pagamento)` e do overload de `frete_consolidado`; desativação da "Entrega Rápida I24".
- `src/app/api/checkout/cotar-frete/route.ts`, `src/lib/checkout/opcoes-frete.ts` (+ teste), `src/lib/checkout/schemas.ts`, `src/app/checkout/page.tsx`, `src/app/checkout/actions.ts`.
- Admin: liga e desliga a flag por loja; seller: dias úteis para postar em Minha Loja.
