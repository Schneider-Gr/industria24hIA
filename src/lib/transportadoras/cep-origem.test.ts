import assert from "node:assert/strict";
import { test } from "vitest";
import { cepOrigemDoProduto, normalizarCep } from "./cep-origem";

test("normaliza máscara, pontos e espaços", () => {
  assert.equal(normalizarCep("92.711-000"), 92711000);
  assert.equal(normalizarCep(" 69005-000 "), 69005000);
  assert.equal(normalizarCep("69903012"), 69903012);
});

test("7 dígitos recuperam o zero à esquerda; o resto é inválido", () => {
  assert.equal(normalizarCep("1000000"), 1000000);
  assert.equal(normalizarCep("6900"), null);
  assert.equal(normalizarCep("123456789"), null);
  assert.equal(normalizarCep(""), null);
  assert.equal(normalizarCep(null), null);
});

test("CEP do produto vale; sem ele, cai no CEP da loja; sem os dois, pendência", () => {
  assert.deepEqual(cepOrigemDoProduto("69005-000", "69088068"), { cep: 69005000, fonte: "produto" });
  assert.deepEqual(cepOrigemDoProduto(null, "69088-068"), { cep: 69088068, fonte: "loja" });
  assert.deepEqual(cepOrigemDoProduto("abc", "69088068"), { cep: 69088068, fonte: "loja" });
  assert.deepEqual(cepOrigemDoProduto("", null), { cep: null, fonte: null });
});
