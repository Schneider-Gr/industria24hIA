## Decisions

### D1. Custo no prazo

`custo(dias) = custo_hoje × max(0, 1 − economia_pct_mes/100 × dias/30)`, linear, em R$
arredondado a centavos. Custo hoje = custo informado ou líquido à vista ÷ markup
(`custoEquivalente`, change montador-faixas-custo-frete D2).

### D2. Desconto sugerido e máximo

- Lucro de hoje = líquido à vista − custo hoje (centavos).
- Sugerido no prazo = maior desconto inteiro (0..90) em que
  `líquido(preço com desconto) − custo(dias) ≥ lucro de hoje`. Lucro de hoje negativo → 0.
- Máximo = maior desconto em que o líquido não fica abaixo de `custo(dias)`.
- O seller pode editar o desconto de cada coluna; a tela mostra o lucro resultante e marca
  em vermelho quando é negativo.

Exemplo (Fibra de Coco: à vista R$ 250, comissão 5%, custo R$ 180, economia 3%/mês):
15 dias 1%, 30 dias 2%, 60 dias 4%, 90 dias 6%; máximo em 60 dias 28%.

### D3. Quantidade mínima viável (joelho)

`un(q) = preço à vista + frete(q)/q`, frete por `freteRegiao` (bandas do avião, distância
informada). Joelho = menor `q ≥ mínima` com `un(min(2q, 1000)) ≥ 0,98 × un(q)`. Sem peso ou
bandas → a mínima, com aviso.

ponytail: varredura 1 a 1 até 1000; a troca de veículo pode antecipar o joelho (o dobro
pede veículo maior), o que é o comportamento real do frete.

Exemplos: fibra (33 kg, R$ 250) → 6 (a mínima); alface (0,22 kg, R$ 4,50, mínima 10) → 46.

### D4. Linhas

Mínima, joelho, 2× e 5× o joelho, até 1000, sem repetição; editáveis, o seller acrescenta.

### D5. Para a venda futura

Colunas com prazo > 0 e desconto ≥ 1 viram degraus `{dias_antes, desconto_pct}` (do mais
distante ao mais próximo, até 6). O desconto sugerido cresce com o prazo, então a curva
respeita a regra "não crescente em direção à entrega". O link leva `produto` e `curva` na
URL; a página da venda futura só aceita a curva se `validarCurva` passar.
