# E3 — Carrinho + Checkout + Frete (spec)

> Criado 2026-07-07. Épico P1 do `backlog.md`; primeiro bloco de ESCRITA no caminho
> do dinheiro. Depende do gate M1 (hardening). Fontes: `database.md`,
> `business-rules.md`, `data-api-reconciliation.md`. Confiança: (a) fato dos docs ·
> (b) prática consolidada · (c) inferência · (d) decisão pendente do dono.

## Objetivo

Comprador logado monta carrinho, informa endereço, vê frete calculado e chega à
revisão do pedido com totais corretos. **Não inclui pagamento** (E4) nem criação de
`pedidos` (E5) — o gate deste épico termina na revisão.

## O que já existe (não recriar)

- Vitrine de leitura (`/`, `/loja/[id]`, `/produto/[id]`, `/categoria/[id]`) com
  filtro `valor > 0` e view `lojas_vitrine` (0012).
- `linha_itens` já tem os campos de entrega/frete da migração 0005
  (`entrega_cep`, `entrega_rua`, `entrega_bairro`, `entrega_numero`,
  `entrega_cidade`, `entrega_complemento`, `valor_frete`, `retirar_na_loja`) —
  o checkout escreve NELES na hora de virar pedido (E5), não em tabela paralela.
- `lojas.valor_pedido_minimo` e `lojas.permite_retirada_na_loja` (0005/0006),
  expostos na `lojas_vitrine`.
- Auth de comprador (`/login`); RLS deny-by-default.

## Modelo de dados — a criar (migration ≥0013)

Nomes reais do Bubble, conforme regra de ouro (nunca inventar schema):

### `carrinhos` (espelho de `Carrinho 0.1`)
(a) O tipo ativo no Bubble é `Carrinho 0.1` (privado); substituiu `Carrinho`/
`Carrinhos` excluídos. (d) **Os campos exatos de `Carrinho 0.1` não foram
extraídos** — `database.md` só confirma a existência do tipo. **Bloqueio de
descoberta: extrair os campos via Data API antes da migration** (mesmo método da
0005). (c) Encaminhamento provável: carrinho por usuário com itens referenciando
produto+quantidade; os 20 `item_para_compra` órfãos do dump (253−233) são
carrinhos abandonados, confirmando que o Bubble usa o próprio `item_para_compra`
como item de carrinho ainda não vinculado a pedido.

Decisão de design daqui: **reusar `linha_itens` com `pedido_id` NULL como item de
carrinho** (fiel ao Bubble, onde o item existe antes do pedido) OU tabela
`carrinho_itens` separada. Fiel ao Bubble = menos transformação no ETL do delta.
→ Registrar a escolha aqui antes de codar. RLS: comprador só lê/escreve os
próprios itens (`cliente_id = auth.uid()`); pedido_id NULL invisível para seller.

### `enderecos_user` (espelho de `endereco_user`)
(a) Tipo confirmado; campos de entrega já conhecidos pelo espelho no item
(cep, rua, bairro, numero, cidade, complemento). RLS: dono só.

### `faixas_cep` (espelho de `FaixaDeCEP`)
(a) 13 registros em produção; campos confirmados em `business-rules.md`:
`CEP Inicial`, `CEP Final`, `ICMS`, `AdValorem`, `KgAdicional`, `PesoFinal`.
Frete calculado por CEP + peso + categoria. Leitura pública (cálculo no
checkout), escrita só admin.
⚠ (d) Relação com Melhor Envio não confirmada (`integrations.md`) — se o frete
real do Bubble consulta Melhor Envio além da tabela, a paridade muda. Capturar
no workflow do Bubble ANTES de implementar E3.4.

## Fluxo

```
/produto/[id] ──"Adicionar"──▶ carrinho (persistente, por usuário)
      │                            │
      ▼                            ▼
CTA WhatsApp (mantém)      /carrinho  (editar qtd, remover, agrupar por loja)
                                   │
                                   ▼
                           /checkout
                             1. endereço (enderecos_user + ViaCEP) ou retirada
                             2. frete por loja (faixas_cep: CEP+peso+categoria)
                             3. valida ValorPedidoMinimo por loja
                                   │
                                   ▼
                           /checkout/revisao  ◀── GATE E3
                             itens + frete + subtotal + total por loja
                             botão "Pagar" desabilitado c/ aviso
                             "integração pendente" até E4 (regra: sem mock)
```

## Regras confirmadas (a)

1. Frete = f(CEP, peso, categoria) sobre `FaixaDeCEP` (ICMS, AdValorem,
   KgAdicional, PesoFinal).
2. Retirada na loja existe (`permite_retirada_na_loja`) e zera frete — (d) como
   altera o fluxo de entrega é pendência dos docs (`business-rules.md`).
3. Pedido mínimo por loja (`ValorPedidoMinimo`) — (d) regra exata de validação é
   pendência dos docs; default razoável: bloquear checkout da loja abaixo do mínimo.
4. Zero pedidos multi-vendedor em produção; estrutura permite. → Carrinho pode
   conter várias lojas, mas o fechamento é **um pedido por loja** (fiel ao dado).

## Decisões abertas (d) — travar antes de codar

| # | Decisão | Default proposto |
|---|---|---|
| D-E3.1 | Item de carrinho: `linha_itens.pedido_id NULL` ou tabela própria? | `linha_itens` NULL (fiel ao Bubble, ETL do delta mais simples) |
| D-E3.2 | Carrinho multi-loja: um checkout que gera N pedidos, ou um checkout por loja? | N pedidos num checkout (fiel ao Bubble: item é a unidade) |
| D-E3.3 | Frete usa só `faixas_cep` ou também Melhor Envio? | Capturar workflow real do Bubble; até lá, só tabela |
| D-E3.4 | Peso do produto: qual campo alimenta o cálculo? (`produtos.peso` existe — validar preenchimento) | Validar cardinalidade no banco antes |

## Histórias e aceite (do backlog, refinadas)

1. **E3.0 Descoberta** — extrair campos de `Carrinho 0.1` via Data API; capturar
   workflow de frete do Bubble; validar preenchimento de `produtos.peso` e
   `faixas_cep` (13 linhas) no dump. *Aceite:* campos documentados em
   `database.md` como confirmados; decisões D-E3.1..4 registradas. **M**
2. **E3.1 Carrinho persistente** — adicionar/editar/remover; sobrevive a reload;
   empty state honesto. *Aceite:* item persiste em tabela real; RLS por dono. **M**
3. **E3.2 Multi-loja** — itens agrupados por loja na revisão, conforme D-E3.2. **M**
4. **E3.3 Endereço + ViaCEP** — CRUD de `enderecos_user`; CEP inválido = erro real. **M**
5. **E3.4 Frete** — cálculo paridade-Bubble; *aceite:* bate com o Bubble em 3 CEPs
   (Manaus, capital fora, interior) + retirada zera frete. **G, risco fiscal**
6. **E3.5 Pedido mínimo** — bloqueio com mensagem clara por loja. **P**
7. **E3.6 Revisão** — totais conferem; "Pagar" desabilitado com aviso de
   integração pendente (nunca simular pagamento). **M**

## Riscos

- **Descoberta primeiro:** E3.0 é bloqueador; codar carrinho sem os campos reais
  de `Carrinho 0.1` viola a regra de ouro do projeto e já causou retrabalho antes
  (`bubble-export/_especulativo/`).
- **Paridade de frete é regra fiscal** (ICMS/AdValorem): validar contra o
  comportamento observado do Bubble, não contra a intuição.
- **Delta do ETL:** o que o piloto transacionar no Bubble durante o E3 precisa
  continuar importável (`import-bubble.mjs`); qualquer tabela nova ganha
  `bubble_id` (padrão da 0010).
