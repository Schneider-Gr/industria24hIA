<!-- Fast-follow de add-cupom-desconto-checkout (PR #497, arquivada em
     openspec/specs/checkout-cupom-desconto/spec.md). Issue a abrir. -->

## Why

`add-cupom-desconto-checkout` entregou só cupom de plataforma (dono=`plataforma`)
porque o custeio por seller pareceria exigir `linha_itens.repasse_vendedor` —
coluna que nenhum código do repo escreve (achado registrado no design daquela
change). Investigação nesta change mostrou que **não é necessário mexer em
repasse_vendedor**: o dono decidiu que cupom de loja custeia pela **margem do
próprio produto, antes do Asaas** — exatamente o mesmo mecanismo que o desconto
progressivo (`preco_faixa`) já usa hoje. O preço unitário cai, e `repasse_ind`/
`repasse_afiliado` são calculados sobre o preço já reduzido, como sempre foram.
Zero mudança no ledger de repasse, zero novo gatilho de PIX automático.

## What Changes

- `cupons.dono` passa a aceitar `loja` (além de `plataforma`), com `loja_id`
  obrigatório. Seller cria e gerencia cupons da própria loja.
- Regra de cupom de loja: mesmo modelo `{alvo, tipo, valor}`, mas `alvo`
  restrito a `produto` e `loja` (pedido do dono: "cupom por produto, múltiplos
  descontos diferentes no mesmo cupom, e cupom para a loja inteira" — não pediu
  `categoria` nem `tudo`, que não fazem sentido escopados a uma única loja).
- **Mecânica = preço com desconto, não abatimento à parte.** Para cupom de
  loja, o preço unitário final do item é `min(preco_faixa, preco_cupom)` — a
  MESMA comparação "aplica o melhor" que já existe entre progressivo e cupom de
  plataforma, só que agora o resultado vira o `valor` de fato da linha (não uma
  coluna separada). `repasse_ind` e `repasse_afiliado` nascem sobre esse valor
  menor, do jeito que já nascem hoje sobre `preco_faixa`. Sem piso: é escolha de
  preço do seller, mesma lógica de risco que ele já assume ao cadastrar uma
  faixa progressiva.
- Cupom de plataforma (Opção C, já em produção) **não muda**: continua com
  `valor` cheio + `desconto_cupom` separado + piso em `repasse_ind`.
- `linha_itens.cupom_id`/`desconto_cupom` também são gravados para cupom de
  loja (auditoria/exibição), mas sem efeito no cálculo — o efeito já está
  embutido em `valor`.
- Nova tela `/seller/cupons` (mesmo padrão CRUD de `/admin/cupons`), travada à
  própria loja no server action.
- RLS: seller gerencia cupons/regras onde `dono='loja' and loja_id = própria
  loja`; lê o próprio histórico de uso.

Fora de escopo: mudar `repasse_vendedor`, rateio de cupom de loja entre lojas
(não se aplica — cupom de loja só atinge a própria loja, que já é 1 pedido),
cupom de afiliado.

## Capabilities

### Modified Capabilities
- `checkout-cupom-desconto`: adiciona dono `loja`, mecânica de preço reduzido
  para esse dono, e a tela `/seller/cupons`.

## Impact

- **Banco**: afrouxa o CHECK de `cupons.dono`; `loja_id` passa a ser usado;
  nova policy RLS para seller; nova função SQL de resolução de preço com cupom
  compartilhada entre os dois donos; `checkout_criar_pedido` ramifica por
  `cupons.dono` no cálculo do preço da linha. `repasses_recalcular_pedido`/
  `calcular_repasses_pedido` **não são tocadas** (mesma garantia da change
  anterior).
- **`src/lib/cupom-desconto.ts`**: nova função pura `precoComCupomLoja`
  (ou extensão da existente) + testes red-green.
- **UI**: `src/app/(seller)/seller/cupons/`.
