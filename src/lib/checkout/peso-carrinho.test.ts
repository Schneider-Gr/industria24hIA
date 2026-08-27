import assert from "node:assert/strict";
import { test } from "vitest";
import { calcularPesoCarrinho } from "./peso-carrinho";

test("calcularPesoCarrinho soma peso x quantidade quando todos os produtos têm peso", () => {
  const itens = [
    { produto_id: "a", quantidade: 2 },
    { produto_id: "b", quantidade: 3 },
  ];
  const pesosPorProduto = { a: 1.5, b: 0.5 };
  assert.equal(calcularPesoCarrinho(itens, pesosPorProduto), 4.5); // 2*1.5 + 3*0.5
});

test("calcularPesoCarrinho trata produto sem peso cadastrado como 0", () => {
  const itens = [
    { produto_id: "a", quantidade: 2 },
    { produto_id: "sem-peso", quantidade: 5 },
  ];
  const pesosPorProduto = { a: 1 };
  assert.equal(calcularPesoCarrinho(itens, pesosPorProduto), 2);
});

test("calcularPesoCarrinho devolve 0 para carrinho totalmente sem peso", () => {
  const itens = [{ produto_id: "x", quantidade: 1 }];
  assert.equal(calcularPesoCarrinho(itens, {}), 0);
});

test("calcularPesoCarrinho trata peso null explícito como 0", () => {
  const itens = [{ produto_id: "a", quantidade: 4 }];
  const pesosPorProduto = { a: null };
  assert.equal(calcularPesoCarrinho(itens, pesosPorProduto), 0);
});

test("calcularPesoCarrinho ignora carrinho vazio", () => {
  assert.equal(calcularPesoCarrinho([], {}), 0);
});
