// Check das regras da compra coletiva v2 (0076-0078). O caminho do dinheiro é
// a divisão no fechamento: a soma dos pedidos tem que fechar EXATA com o total
// da coletiva, inclusive com frete rateado por quantidade.
// Validado contra o banco real em 24/07/2026 (begin/rollback): 3 participantes
// 4/8/9 un a R$9,33 → 83,97+74,64+37,32 = 195,93 e frete 8,40+7,46+3,73 = 19,59.

import assert from "node:assert/strict";
import { precoLote, proximoLote, dividir, economiaPorUnidade, type Lote } from "./coletiva";

const HOJE = "2026-07-24";
const lotes: Lote[] = [
  { min_qtd: 30, valor_unitario: 9.9 },
  { min_qtd: 60, valor_unitario: 9.3 },
  { min_qtd: 100, valor_unitario: 8.7 },
];

// Preço = melhor lote atingido; abaixo do primeiro, preço base.
assert.equal(precoLote(lotes, 10, 10.9, HOJE), 10.9);
assert.equal(precoLote(lotes, 30, 10.9, HOJE), 9.9);
assert.equal(precoLote(lotes, 65, 10.9, HOJE), 9.3);
assert.equal(precoLote(lotes, 400, 10.9, HOJE), 8.7);

// Lote vencido não conta (mesma regra de preco_faixa).
const comVencido: Lote[] = [
  { min_qtd: 30, valor_unitario: 9.9, validade: "2026-01-01" },
  { min_qtd: 60, valor_unitario: 9.3, validade: null },
];
assert.equal(precoLote(comVencido, 35, 10.9, HOJE), 10.9);
assert.equal(precoLote(comVencido, 60, 10.9, HOJE), 9.3);

// Próximo lote: o que a página anuncia como meta seguinte.
assert.equal(proximoLote(lotes, 10, HOJE)?.min_qtd, 30);
assert.equal(proximoLote(lotes, 65, HOJE)?.min_qtd, 100);
assert.equal(proximoLote(lotes, 120, HOJE), null);

// Divisão exata (caso do E2E em produção).
const d = dividir(9.33, [4, 8, 9], 19.59);
assert.deepEqual(
  d.map((p) => [p.quantidade, p.valor, p.frete]),
  [
    [9, 83.97, 8.4],
    [8, 74.64, 7.46],
    [4, 37.32, 3.73],
  ],
);
assert.equal(
  d.reduce((s, p) => s + p.valor, 0),
  195.93,
);
assert.equal(
  d.reduce((s, p) => s + p.frete, 0),
  19.59,
);

// Divisão com sobra de centavos no frete: 10% de 100,00 entre 1/1/1 dá
// 3,33×3 = 9,99 — o centavo que falta vai para o maior participante.
const s = dividir(10, [1, 1, 1], 10);
assert.equal(
  s.reduce((acc, p) => acc + p.frete, 0),
  10,
);
assert.equal(s[0].frete, 3.34);

// Participante único: recebe tudo.
const u = dividir(5, [7], 3.5);
assert.equal(u[0].valor, 35);
assert.equal(u[0].frete, 3.5);
assert.equal(u[0].total, 38.5);

// Sem participante, sem divisão.
assert.deepEqual(dividir(5, [], 0), []);

assert.equal(economiaPorUnidade(10.9, 9.3), 1.6);

console.log("coletiva: ok");
