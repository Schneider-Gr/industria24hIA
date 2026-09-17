import assert from "node:assert/strict";
import { test } from "vitest";
import { normalizarPercentual, formatPctComissao } from "./percentual";

test("normalizarPercentual aceita as formas que o admin digita", () => {
  assert.equal(normalizarPercentual("12"), 12);
  assert.equal(normalizarPercentual("12,5"), 12.5);
  assert.equal(normalizarPercentual("12,5%"), 12.5);
  assert.equal(normalizarPercentual(" 12.5 "), 12.5);
  assert.equal(normalizarPercentual("12,567"), 12.57);
});

test("vazio é herança e zero é comissão nula, e os dois são distintos", () => {
  assert.equal(normalizarPercentual(""), null);
  assert.equal(normalizarPercentual("   "), null);
  assert.equal(normalizarPercentual("0"), 0);
  assert.notEqual(normalizarPercentual("0"), normalizarPercentual(""));
});

test("percentual fora da faixa é recusado antes de chegar ao banco", () => {
  assert.throws(() => normalizarPercentual("-1"));
  assert.throws(() => normalizarPercentual("101"));
  assert.throws(() => normalizarPercentual("abc"));
});

test("formatPctComissao usa o snapshot da venda quando existe", () => {
  assert.equal(
    formatPctComissao({ valor: 100, repasse_ind: 12, repasse_ind_pct: 12 }),
    "12,00%",
  );
  // Snapshot manda mesmo quando não bate com o valor: o que vale é o que foi
  // cobrado, não o que dá para recalcular.
  assert.equal(
    formatPctComissao({ valor: 100, repasse_ind: 5, repasse_ind_pct: 0 }),
    "0,00%",
  );
});

test("item anterior à 0180 cai em 5% só quando o valor confere", () => {
  assert.equal(
    formatPctComissao({ valor: 10.2, repasse_ind: 0.51, repasse_ind_pct: null }),
    "5,00%",
  );
  // Pedido migrado do Bubble: comissão que não corresponde a 5% do valor não
  // vira percentual inventado.
  assert.equal(
    formatPctComissao({ valor: 100, repasse_ind: 17.43, repasse_ind_pct: null }),
    "—",
  );
  assert.equal(
    formatPctComissao({ valor: null, repasse_ind: null, repasse_ind_pct: null }),
    "—",
  );
});
