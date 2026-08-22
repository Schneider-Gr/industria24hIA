import assert from "node:assert/strict";
import { test } from "vitest";
import { montarOpcaoInterna, montarOpcaoUberDirect, decidirOpcoesFrete } from "./opcoes-frete";

test("montarOpcaoInterna calcula percentual sobre o valor dos itens", () => {
  const opcao = montarOpcaoInterna("transp-1", "Entrega Rápida", 8, 199.9);
  assert.equal(opcao.valor, 15.99); // 199.90 * 0.08 = 15.992 -> round(2 casas) = 15.99
});

test("montarOpcaoUberDirect converte centavos para reais", () => {
  const opcao = montarOpcaoUberDirect("transp-uber", "cotacao-1", 1099, 35);
  assert.equal(opcao.valor, 10.99);
  assert.equal(opcao.tipo, "uber_direct");
  assert.equal(opcao.prazoMin, 35);
});

test("decidirOpcoesFrete prioriza interna quando cobre o CEP", () => {
  const interna = montarOpcaoInterna(null, "Padrão", 10, 100);
  const uber = montarOpcaoUberDirect("t", "c", 500, 20);
  assert.deepEqual(decidirOpcoesFrete(interna, uber), [interna]);
});

test("decidirOpcoesFrete cai para Uber Direct quando não há cobertura interna", () => {
  const uber = montarOpcaoUberDirect("t", "c", 500, 20);
  assert.deepEqual(decidirOpcoesFrete(null, uber), [uber]);
});

test("decidirOpcoesFrete devolve lista vazia sem nenhuma cobertura", () => {
  assert.deepEqual(decidirOpcoesFrete(null, null), []);
});
