import assert from "node:assert/strict";
import { test } from "vitest";
import {
  estadoEstoque,
  foraDaVitrine,
  rotuloEstado,
  vendendoPorReserva,
  ESTOQUE_CRITICO_PADRAO,
} from "./estoque-estado";

test("saldo zerado é esgotado", () => {
  assert.equal(estadoEstoque({ estoque_atual: 0 }), "esgotado");
  assert.equal(estadoEstoque({ estoque_atual: null }), "esgotado");
});

test("crítico usa o limite de estoque crítico do produto quando existe", () => {
  assert.equal(estadoEstoque({ estoque_atual: 1000, estoque_critico: 1000 }), "critico");
  assert.equal(estadoEstoque({ estoque_atual: 1001, estoque_critico: 1000 }), "normal");
});

test("sem limite próprio, crítico cai no limiar padrão", () => {
  assert.equal(estadoEstoque({ estoque_atual: ESTOQUE_CRITICO_PADRAO }), "critico");
  assert.equal(estadoEstoque({ estoque_atual: ESTOQUE_CRITICO_PADRAO + 1 }), "normal");
});

test("esgotado sem reserva sai da vitrine; com reserva continua vendendo", () => {
  assert.equal(foraDaVitrine({ estoque_atual: 0 }), true);
  assert.equal(foraDaVitrine({ estoque_atual: 0, temReserva: true }), false);
  assert.equal(vendendoPorReserva({ estoque_atual: 0, temReserva: true }), true);
  assert.equal(rotuloEstado({ estoque_atual: 0, temReserva: true }), "Esgotado · vendendo por reserva");
  assert.equal(rotuloEstado({ estoque_atual: 0 }), "Esgotado · fora da vitrine");
});

test("mínimo por pedido não mexe no estoque crítico", () => {
  // Tijolo: mínimo por pedido 12, estoque 10. Antes da separação virava "crítico".
  const produto = { estoque_atual: 10, quantidade_minima: 12 } as Parameters<typeof estadoEstoque>[0];
  assert.equal(estadoEstoque(produto), "normal");
});
