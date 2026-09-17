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

test("crítico usa a quantidade mínima do produto quando existe", () => {
  assert.equal(estadoEstoque({ estoque_atual: 1000, quantidade_minima: 1000 }), "critico");
  assert.equal(estadoEstoque({ estoque_atual: 1001, quantidade_minima: 1000 }), "normal");
});

test("sem quantidade mínima, crítico cai no limiar padrão", () => {
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
