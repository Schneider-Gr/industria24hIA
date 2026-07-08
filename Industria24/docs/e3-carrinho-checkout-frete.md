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

### `carrinhos` (espelho de `Carrinho 0.1`) — **CAMPOS CONFIRMADOS 07/07**
(a) Extraído via Data API (dump completo em `bubble-export/data/CarrinhoV01.json`,
334 registros). Estrutura real é MÍNIMA:

| Campo Bubble | Preenchimento | Mapeia para |
|---|---|---|
| `Comprador` (User) | 334/334 | `carrinhos.comprador_id` |
| `itens_para_compra` (lista) | 264/334 | `linha_itens.carrinho_id` (FK invertida) |
| `pedidoVendedor` | 245/334 | `carrinhos.pedido_id` (preenchido = virou pedido) |

245 carrinhos viraram pedido; 89 abandonados/abertos. **D-E3.1 RESOLVIDA pela
evidência:** o Bubble usa o próprio `item_para_compra` como item de carrinho
(o item existe antes do pedido). Espelho fiel: tabela `carrinhos` (id,
comprador_id, pedido_id NULL, bubble_id) + coluna `linha_itens.carrinho_id`.
RLS: comprador só lê/escreve os próprios (`comprador_id = auth.uid()`);
carrinho sem pedido invisível para seller.

### ~~`enderecos_user`~~ — **NÃO CRIAR (confirmado 07/07)**
(a) `endereco_user` tem **0 registros em produção** (Data API). O caderno de
endereços existe no schema do Bubble mas nunca foi usado: o endereço de entrega
vive no ITEM (`entrega_cep/rua/bairro/numero/cidade/complemento`, já na 0005).
E3.3 simplifica: formulário de endereço no checkout grava direto nos itens do
pedido. Sem CRUD de endereços no MVP (YAGNI comprovado pelo dado).

### `faixas_cep` (espelho de `FaixaDeCEP`) — **⚠ VESTIGIAL (confirmado 07/07)**
(a) Os 13 registros reais são inúteis para frete: 10 micro-faixas de Rio
Branco/AC com `AdValorem=32` e ICMS/KgAdicional/PesoFinal **zerados**; 3 faixas
amplas (Manaus, AC, DF) **sem valor nenhum**. Não há campo de valor-base de
frete nem categoria na tabela. Além disso `PesoDoProduto` só existe em 89/358
produtos (`peso_cubado` 19/358) — frete por peso é incalculável para 75% do
catálogo. **Conclusão: o frete vivo do Bubble NÃO sai desta tabela** — vem de
workflow (Melhor Envio? tabela da transportadora? manual?). E3.4 não é
"portar a tabela": é capturar o workflow real de frete no editor Bubble
(D-E3.3 continua aberta e agora é O bloqueio do épico). Alternativa de corte:
frete manual/combinado via WhatsApp no MVP de checkout, com campo
`valor_frete` preenchido pelo seller antes do pagamento (d).

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

| # | Decisão | Estado (07/07) |
|---|---|---|
| D-E3.1 | Item de carrinho: `linha_itens` + tabela `carrinhos`? | ✅ **RESOLVIDA pelo dado**: `carrinhos` mínima (comprador, pedido) + `linha_itens.carrinho_id` |
| D-E3.2 | Carrinho multi-loja: um checkout que gera N pedidos, ou um por loja? | (d) Aberta — default: N pedidos num checkout |
| D-E3.3 | De onde vem o frete real? | 🔴 **É O BLOQUEIO**: `FaixaDeCEP` é vestigial; capturar workflow no editor Bubble ou decidir frete manual no MVP |
| D-E3.4 | Peso do produto alimenta cálculo? | ✅ Validado: `PesoDoProduto` 89/358, `peso_cubado` 19/358 — frete por peso inviável p/ 75% do catálogo |

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
