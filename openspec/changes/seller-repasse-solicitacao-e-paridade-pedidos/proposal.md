<!-- Engenharia reversa do Bubble /seller (aba logada, 04/09/2026) + auditoria
     do caminho do dinheiro no schema em produção. Issue a abrir. -->

## Why

Três problemas independentes, todos na mesma tela, todos confirmados contra
produção nesta change:

1. **O repasse ao seller está inoperante para pedido novo.**
   `repasses_recalcular_pedido` (0111) soma `linha_itens.repasse_vendedor`,
   coluna que existe desde a 0005 apenas porque foi importada do Bubble e que
   **nenhuma migration e nenhum código do repo escrevem** (a própria 0156
   registra isso em comentário). Consulta em produção: 293 dos 305 itens têm
   valor, todos vindos do Bubble (`pedidos.bubble_id` não nulo); todos os itens
   de setembro/2026 estão NULL. Como a RPC tem `having sum(...) > 0`, o pedido
   nascido no Next confirma entrega e a linha de repasse do seller **nem chega a
   ser criada**. Hoje o ledger tem 1 repasse de seller, em `falhou`, R$ 386,10.

2. **O seller perdeu o botão de solicitar o repasse.** No Bubble, cada item de
   pedido tem, na coluna Transferência, um botão "Solicitar Transferência", que
   vira "Transferência ja realizada" (desabilitado) depois. Gravação de tela do
   pedido MKMNDBAHAA (04/09/2026) fixa quando ele aparece: com o pedido **pago**
   a coluna Transferência está vazia e o que existe é o botão "Entregar"; o
   botão de transferência só surge **depois** que o lojista digita o código do
   comprador no modal "Entrega Balcão" e a entrega é confirmada. O gate do
   Bubble é a confirmação de entrega, não o pagamento — a versão anterior desta
   proposal afirmava o contrário e estava errada.

   O Next só mostra o estado ("Transferência realizada" / "Aguardando"), sem
   ação nenhuma: não existe caminho pelo qual o seller peça o próprio dinheiro.
   O único gatilho é o disparo automático da 0111, que é best-effort — se a
   transferência falhou, se a chave PIX foi cadastrada depois, ou se o pedido
   veio migrado do Bubble sem ledger, o seller não tem como reagir.

3. **Paridade da tela.** Comparando com o Bubble ao vivo, faltam: coluna Dt
   Pagamento (a tela mostra a data do pedido), a forma de pagamento no badge de
   status, os filtros "Pago e Entregue" e "Pago e não entregue", a data/hora na
   coluna Entregue, e os dados de entrega do item (endereço e contato), que no
   Bubble abrem no popup "Ver Entrega".

4. **`repasses_recalcular_pedido` está quebrada em produção, e essa é a causa
   raiz.** A 0111 usa `on conflict (pedido_id, destino, afiliado_id)`, mas em
   produção não existe constraint única com essa assinatura: a
   `0147_fix_repasses_dedup` a substituiu por dois índices únicos **parciais**
   (`repasses_seller_uniq` e `repasses_afiliado_uniq`). Índice parcial só serve
   de árbitro se o `ON CONFLICT` repetir o predicado, então a função levanta
   `42P10` em **toda** execução, não só quando há conflito. Como o `perform`
   está dentro de `pedido_confirmar_entrega`, a confirmação de entrega inteira
   aborta: hoje o repasse automático não acontece nunca. Confirmado contra
   produção em 04/09/2026 executando a RPC dentro de `begin; ... rollback;`.

## What Changes

- **`repasses_recalcular_pedido` deixa de depender de `repasse_vendedor`.** O
  valor do seller passa a ser derivado das colunas que o checkout realmente
  escreve: `valor - repasse_ind - repasse_afiliado` por linha, com
  `coalesce(repasse_vendedor, <derivado>)` para não reescrever a história dos
  pedidos importados do Bubble, que já têm o líquido gravado. Conferido contra
  produção em 04/09/2026: das 293 linhas legadas, 276 batem com a derivação, 13
  divergem em R$ 0,01 por arredondamento do Bubble e 4 divergem até R$ 13,73
  porque o Bubble descontou uma segunda comissão que nunca foi gravada em
  `repasse_afiliado`; em todas o `coalesce` preserva o valor legado. As 12
  linhas com `repasse_vendedor` NULL são as únicas que passam a usar a
  derivação.
  - Frete **não** entra no repasse nesta change. A decisão D-E4.2 do
    `e4-split-repasse-bpmn.md` dizia "+ frete", mas foi tomada antes de
    transportadora com tabela (0145) e Uber Direct (0139/0140), onde o frete tem
    destinatário próprio. Incluir frete é uma linha na mesma expressão e fica
    como decisão explícita do dono, não como efeito colateral desta correção.
  - Cupom: `desconto_cupom` de cupom de plataforma sai do `repasse_ind` e não
    toca no seller; cupom de loja já reduziu `valor`. A expressão fecha nos dois
    casos sem termo extra.
- **Novo gatilho: solicitação de repasse pelo seller, a partir da confirmação
  de entrega.** Server action + RPC `repasse_solicitar_pedido(p_pedido_id)`,
  restrita ao dono da loja, elegível quando o pedido está pago **e todo item
  tem entrega confirmada** — o mesmo critério de `pedido_confirmar_entrega`
  (0111), com fallback em `linha_itens.entregue` para os pedidos do Bubble que
  nunca ganharam linha em `entregas`. Não antecipa dinheiro: é um retry manual
  de um repasse que já está elegível. Ela recalcula o ledger e marca as
  linhas do seller como solicitadas; a transferência PIX em si continua passando
  pelo mesmo caminho de `lib/repasses.ts` (Asaas `POST /v3/transfers`), com o
  mesmo tratamento de chave inelegível e o mesmo fallback humano em
  `/admin/repasses`.
  - O gatilho por confirmação de entrega (0111) **continua existindo**: os dois
    convergem no mesmo ledger idempotente, e o índice parcial único por
    (pedido, destino) já impede repasse em dobro.
- **`ON CONFLICT` passa a repetir o predicado de cada índice parcial** —
  `(pedido_id, destino) where afiliado_id is null` para o seller e
  `(pedido_id, destino, afiliado_id) where afiliado_id is not null` para o
  afiliado. Sem isso nada mais nesta change funciona.
- **Paridade da tela de pedidos** nos seis pontos listados acima.

## Non-goals

- Split nativo Asaas: segue descartado (decisão de 10/07/2026).
- Estorno automático pós-repasse: segue manual (Processo 3 do E4).
- "PDF de todos itens" e impressão por item do Bubble: fora desta change.
- Aprovação do admin antes da transferência: nesta change a solicitação do
  seller dispara o mesmo fluxo do gatilho de entrega, sem etapa de aprovação
  nova. Se o dono quiser um gate humano, é uma change própria.

## Impact

Caminho do dinheiro. Migration nova (schema + RPC), server action nova, e a
tela `src/app/(seller)/seller/pedidos/page.tsx`. Toda a migration deve ser
validada em `begin; ... rollback;` contra produção antes do push, e o valor
derivado precisa ser conferido contra uma amostra de pedidos reais antes de
qualquer transferência ser disparada por ele.
