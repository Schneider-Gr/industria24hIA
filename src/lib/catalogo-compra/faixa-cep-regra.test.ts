// Check da cobertura por faixa de CEP. O que importa: produto sem faixa nunca
// pode sumir da vitrine, e as bordas do intervalo contam como atendidas.

import assert from "node:assert/strict";
import { test } from "vitest";

import { cepCobertoPelaFaixa, marcarIndisponiveis } from "./faixa-cep-regra";

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

// A regra que o PR #523 tinha errado: o legado MARCA o produto fora da faixa,
// nunca o remove da listagem.
const ITENS: { id: string; indisponivelRegiao?: boolean }[] = [{ id: "a" }, { id: "b" }, { id: "c" }];

test("marcar nunca encolhe a lista", () => {
  const r = marcarIndisponiveis(ITENS, new Set(["b"]));
  assert.equal(r.length, 3);
  assert.deepEqual(r.map((i) => i.id), ["a", "b", "c"]);
});

test("só o id fora da faixa recebe a marca", () => {
  const r = marcarIndisponiveis(ITENS, new Set(["b"]));
  assert.equal(r[0].indisponivelRegiao, undefined);
  assert.equal(r[1].indisponivelRegiao, true);
  assert.equal(r[2].indisponivelRegiao, undefined);
});

test("sem ninguém fora, devolve a mesma lista", () => {
  assert.equal(marcarIndisponiveis(ITENS, new Set()), ITENS);
});
