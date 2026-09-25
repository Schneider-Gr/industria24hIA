import assert from "node:assert/strict";
import { test } from "vitest";
import { PISO_KM_PADRAO, precoPorKm } from "./preco-km";

test("preço por km (PRD 053): só ida, km a 0,1, piso por km", () => {
  // 12,34 km → 12,3 km cobrados × R$ 6,50 = R$ 79,95
  assert.deepEqual(precoPorKm({ distanciaM: 12340, valorKm: 6.5 }), { ok: true, kmCobrados: 12.3, preco: 79.95, freteKm: 79.95 });
  // no piso passa
  assert.equal(precoPorKm({ distanciaM: 1000, valorKm: PISO_KM_PADRAO }).ok, true);
  // abaixo do piso recusa
  assert.deepEqual(precoPorKm({ distanciaM: 1000, valorKm: 5.99 }), { ok: false, piso: 6 });
  // piso da loja sobrepõe o padrão
  assert.deepEqual(precoPorKm({ distanciaM: 1000, valorKm: 7, pisoKm: 8 }), { ok: false, piso: 8 });
});

test("extras do simulador: taxa de porto e ajudante somam ao frete do km", () => {
  // 10 km × R$ 6 = R$ 60 + porto R$ 15 + ajudante R$ 80 = R$ 155
  assert.deepEqual(precoPorKm({ distanciaM: 10000, valorKm: 6, taxaPorto: 15, custoAjudante: 80 }), {
    ok: true,
    kmCobrados: 10,
    preco: 155,
    freteKm: 60,
  });
  // sem extras, freteKm = preco
  const semExtras = precoPorKm({ distanciaM: 10000, valorKm: 6 });
  assert.equal(semExtras.ok && semExtras.freteKm, 60);
  // extras negativos são ignorados
  const negativo = precoPorKm({ distanciaM: 10000, valorKm: 6, taxaPorto: -5 });
  assert.equal(negativo.ok && negativo.preco, 60);
});
