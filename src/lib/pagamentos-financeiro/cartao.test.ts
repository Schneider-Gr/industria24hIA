import assert from "node:assert/strict";
import { test } from "vitest";
import { calcularValorParcela, somarRepasseVendedor, validarParcelas } from "./cartao";

test("calcularValorParcela: divisão exata", () => {
  assert.equal(calcularValorParcela(300, 3), 100);
});

test("calcularValorParcela: arredonda para centavos (dízima)", () => {
  assert.equal(calcularValorParcela(100, 3), 33.33);
});

test("calcularValorParcela: 1 parcela devolve o valor total", () => {
  assert.equal(calcularValorParcela(199.9, 1), 199.9);
});

test("calcularValorParcela: rejeita menos de 1 parcela", () => {
  assert.throws(() => calcularValorParcela(100, 0));
});

test("validarParcelas: aceita de 1 a 12", () => {
  assert.equal(validarParcelas(1), true);
  assert.equal(validarParcelas(12), true);
});

test("validarParcelas: rejeita 0 e 13", () => {
  assert.equal(validarParcelas(0), false);
  assert.equal(validarParcelas(13), false);
});

test("validarParcelas: rejeita não-inteiro", () => {
  assert.equal(validarParcelas(2.5), false);
});

test("somarRepasseVendedor: soma repasse_vendedor de todos os itens", () => {
  const itens = [{ repasse_vendedor: 10 }, { repasse_vendedor: 5.5 }];
  assert.equal(somarRepasseVendedor(itens), 15.5);
});

test("somarRepasseVendedor: trata null como zero", () => {
  const itens = [{ repasse_vendedor: 10 }, { repasse_vendedor: null }];
  assert.equal(somarRepasseVendedor(itens), 10);
});

test("somarRepasseVendedor: lista vazia soma zero", () => {
  assert.equal(somarRepasseVendedor([]), 0);
});
