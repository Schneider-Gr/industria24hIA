// Check da cobertura por faixa de CEP. O que importa: produto sem faixa nunca
// pode sumir da vitrine, e as bordas do intervalo contam como atendidas.

import assert from "node:assert/strict";
import { test } from "vitest";

import { cepCobertoPelaFaixa } from "./faixa-cep-regra";

// A faixa de Manaus, que 31 produtos usam no export do Bubble.
const MANAUS = { cep_inicial: 69000000, cep_final: 69099999 };

test("produto sem faixa atende qualquer CEP", () => {
  assert.equal(cepCobertoPelaFaixa(90050100, null), true);
  assert.equal(cepCobertoPelaFaixa(90050100, undefined), true);
});

test("as duas bordas do intervalo estão cobertas", () => {
  assert.equal(cepCobertoPelaFaixa(69000000, MANAUS), true);
  assert.equal(cepCobertoPelaFaixa(69099999, MANAUS), true);
});

test("um CEP fora do intervalo não é coberto", () => {
  assert.equal(cepCobertoPelaFaixa(68999999, MANAUS), false);
  assert.equal(cepCobertoPelaFaixa(69100000, MANAUS), false);
  // Porto Alegre, o caso que zerou a vitrine no incidente do PR #517.
  assert.equal(cepCobertoPelaFaixa(90050100, MANAUS), false);
});
