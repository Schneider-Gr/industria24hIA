import { test } from "vitest";
import assert from "node:assert/strict";
import { custoEquivalente, descontoMaximo, liquidoDe } from "./montador-faixas";

// Change montador-faixas-custo-frete, design D1–D3.

test("líquido do seller em centavos", () => {
  assert.equal(liquidoDe(4.74, 5), 4.5); // 474 × 95 / 100 = 450,3 → 450
  assert.equal(liquidoDe(13.52, 5), 12.84);
});

test("custo equivalente: custo direto, markup ou nada", () => {
  assert.equal(custoEquivalente({ custo: 2.1, markup: null, liquidoAvista: 4.5 }), 2.1);
  assert.equal(custoEquivalente({ custo: null, markup: 1.3, liquidoAvista: 4.5 }), 3.46);
  assert.equal(custoEquivalente({ custo: null, markup: null, liquidoAvista: 4.5 }), null);
  assert.equal(custoEquivalente({ custo: null, markup: 1, liquidoAvista: 4.5 }), null); // markup ≤ 1 não vale
  assert.equal(custoEquivalente({ custo: 0, markup: 1.3, liquidoAvista: 4.5 }), 3.46); // custo 0 = vazio
});

test("desconto máximo sem ficar abaixo do custo (cenário da spec)", () => {
  assert.equal(descontoMaximo({ valorAvista: 4.74, comissaoPct: 5, custo: 3.46 }), 23);
  assert.equal(descontoMaximo({ valorAvista: 4.74, comissaoPct: 5, custo: 5 }), 0); // à vista já abaixo do custo
  assert.equal(descontoMaximo({ valorAvista: 4.74, comissaoPct: 5, custo: 0.01 }), 90);
  assert.equal(descontoMaximo({ valorAvista: 4.74, comissaoPct: 5, custo: null }), null);
});
