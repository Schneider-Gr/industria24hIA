import assert from "node:assert/strict";
import { test } from "vitest";
import { produtosParaAlertar } from "./alerta-imediato";

const item = (over: Partial<Parameters<typeof produtosParaAlertar>[0][0]> = {}) => ({
  produto_id: "p1",
  nome: "Polpa de açaí 1kg",
  estoque_atual: 3,
  estoque_critico: null,
  quantidade: 10,
  ...over,
});

test("venda que derruba o produto abaixo do limiar alerta", () => {
  // 13 antes (normal), 3 depois (crítico, padrão 5).
  const r = produtosParaAlertar([item()]);
  assert.equal(r.length, 1);
  assert.equal(r[0].estado, "critico");
  assert.equal(r[0].saldo, 3);
});

test("produto que já estava crítico antes da venda não realerta", () => {
  // 4 antes, 2 depois: crítico nos dois lados.
  assert.deepEqual(produtosParaAlertar([item({ estoque_atual: 2, quantidade: 2 })]), []);
});

test("crítico que passa a esgotado é mudança de estado e alerta", () => {
  const r = produtosParaAlertar([item({ estoque_atual: 0, quantidade: 3 })]);
  assert.equal(r.length, 1);
  assert.equal(r[0].estado, "esgotado");
});

test("produto que segue normal não alerta", () => {
  assert.deepEqual(produtosParaAlertar([item({ estoque_atual: 90, quantidade: 10 })]), []);
});

test("usa o estoque crítico declarado pelo seller, não o padrão", () => {
  // 45 depois de vender 15: normal pelo padrão 5, e mudança para crítico
  // para quem declarou mínimo 50 (60 antes era normal).
  assert.deepEqual(produtosParaAlertar([item({ estoque_atual: 45, quantidade: 15 })]), []);
  const r = produtosParaAlertar([item({ estoque_atual: 45, quantidade: 15, estoque_critico: 50 })]);
  assert.equal(r.length, 1);
  assert.equal(r[0].estado, "critico");
});

test("mesmo produto em duas linhas conta como uma venda só", () => {
  // 2+2 = 4 vendidos, saldo 4: antes eram 8 (normal), depois crítico.
  const r = produtosParaAlertar([
    item({ estoque_atual: 4, quantidade: 2 }),
    item({ estoque_atual: 4, quantidade: 2 }),
  ]);
  assert.equal(r.length, 1);
});

test("item de venda futura fica fora: não consome estoque_atual", () => {
  assert.deepEqual(produtosParaAlertar([item({ venda_futura_id: "vf1" })]), []);
});

test("um pedido com vários produtos rende uma lista, com esgotado na frente", () => {
  const r = produtosParaAlertar([
    item({ produto_id: "p1", nome: "Crítico", estoque_atual: 2, quantidade: 10 }),
    item({ produto_id: "p2", nome: "Esgotado", estoque_atual: 0, quantidade: 10 }),
  ]);
  assert.deepEqual(r.map((p) => p.nome), ["Esgotado", "Crítico"]);
});
