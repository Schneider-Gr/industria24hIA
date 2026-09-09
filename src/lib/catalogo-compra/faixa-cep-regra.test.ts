// Check da cobertura por faixa de CEP. O que importa: produto sem faixa nunca
// pode sumir da vitrine, e as bordas do intervalo contam como atendidas.

import assert from "node:assert/strict";
import { test } from "vitest";

import {
  cepCobertoPelaFaixa,
  cepCobertoPorAlguma,
  contarForaDaFaixa,
  esconderForaDaFaixa,
} from "./faixa-cep-regra";

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

const ITENS = [{ id: "a" }, { id: "b" }, { id: "c" }];

// Decisão do dono em 08/09 (reverte a marcação): o produto fora da faixa não
// aparece. O check que importa é que só o que está fora sai.
test("esconder remove apenas quem está fora", () => {
  const r = esconderForaDaFaixa(ITENS, new Set(["b"]));
  assert.deepEqual(r.map((i) => i.id), ["a", "c"]);
});

test("sem ninguém fora, esconder devolve a mesma lista", () => {
  assert.equal(esconderForaDaFaixa(ITENS, new Set()), ITENS);
});

test("todos fora resulta em lista vazia (vitrine vazia é esperado)", () => {
  assert.deepEqual(esconderForaDaFaixa(ITENS, new Set(["a", "b", "c"])), []);
});

// O aviso "N produtos nao estao disponiveis" so vale se N for confiavel: a
// home junta quatro listas que se sobrepoem, e somar as listas contaria o
// mesmo produto varias vezes.
test("contagem ignora repetido entre listas", () => {
  const juntas = [...ITENS, { id: "b" }, { id: "c" }];
  assert.equal(contarForaDaFaixa(juntas, new Set(["b", "c"])), 2);
});

test("contagem ignora id fora do conjunto que nao esta na lista", () => {
  assert.equal(contarForaDaFaixa(ITENS, new Set(["b", "z"])), 1);
});

test("sem ninguem fora, contagem e zero", () => {
  assert.equal(contarForaDaFaixa(ITENS, new Set()), 0);
});

// Cobertura N:N (0169): o produto pode declarar mais de uma região.
const ACRE = { cep_inicial: 69900000, cep_final: 69999999 };

test("basta uma das regiões cobrir o CEP", () => {
  assert.equal(cepCobertoPorAlguma(69088068, [MANAUS, ACRE]), true);
  assert.equal(cepCobertoPorAlguma(69903012, [MANAUS, ACRE]), true);
});

test("nenhuma região cobrindo é não coberto", () => {
  assert.equal(cepCobertoPorAlguma(90050100, [MANAUS, ACRE]), false);
});

test("sem região declarada, não esconde", () => {
  assert.equal(cepCobertoPorAlguma(90050100, []), true);
});
