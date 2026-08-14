// Check da regra de desconto progressivo do checkout (preco_faixa, migration
// 0016; usada pela checkout_criar_pedido desde 0019/0037/0074): aplica o
// valor_unitario da faixa de MAIOR min_qtd <= quantidade, ignorando faixas
// vencidas; sem faixa aplicável, cobra o preço base. Validado ao vivo em prod
// 23/07/2026 (Cimento CP-II: 50 un → R$39,90; faixa vencida → base).
//
// ponytail: réplica pura da função SQL em vez de chamar o banco — se a regra
// mudar na migration, mude aqui.

import assert from "node:assert/strict";
import { test } from "vitest";
import { precoFaixa as precoFaixaLib, faixaVencida, type Faixa } from "./preco-faixa";

test("preco-faixa", () => {

const HOJE = "2026-07-23";
const precoFaixa = (faixas: Faixa[], ativo: boolean, qtd: number, base: number) =>
  precoFaixaLib(faixas, ativo, qtd, base, HOJE);

const faixas: Faixa[] = [
  { min_qtd: 50, valor_unitario: 39.9, validade: null },
  { min_qtd: 200, valor_unitario: 37.5, validade: null },
];

// Abaixo da 1ª faixa: preço base, sem desconto.
assert.equal(precoFaixa(faixas, true, 10, 42.9), 42.9);

// Exatamente na faixa: aplica o valor da faixa a TODAS as unidades (semântica
// do Bubble: preço por faixa, não desconto marginal por degrau).
assert.equal(precoFaixa(faixas, true, 50, 42.9), 39.9);

// Entre faixas: vale a maior min_qtd atingida.
assert.equal(precoFaixa(faixas, true, 199, 42.9), 39.9);
assert.equal(precoFaixa(faixas, true, 200, 42.9), 37.5);

// Faixa vencida é ignorada; a válida seguinte ainda vale.
const comVencida: Faixa[] = [
  { min_qtd: 50, valor_unitario: 39.9, validade: "2026-01-01" },
  { min_qtd: 200, valor_unitario: 37.5, validade: null },
];
assert.equal(precoFaixa(comVencida, true, 50, 42.9), 42.9);
assert.equal(precoFaixa(comVencida, true, 200, 42.9), 37.5);

// Promoção inativa: sempre base.
assert.equal(precoFaixa(faixas, false, 500, 42.9), 42.9);

// faixaVencida: usada pela vitrine para riscar a faixa que não vale mais.
assert.equal(faixaVencida({ min_qtd: 50, valor_unitario: 39.9, validade: "2026-01-01" }, HOJE), true);
assert.equal(faixaVencida({ min_qtd: 50, valor_unitario: 39.9, validade: null }, HOJE), false);

console.log("preco-faixa: ok");
});
