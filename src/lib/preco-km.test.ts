import assert from "node:assert/strict";
import { test } from "vitest";
import { precoPorKm } from "./preco-km";

test("preço por km: linear, ida e volta e mínimo", () => {
  // 12,34 km × R$ 2,50 = 30,75 (km arredondado a 0,1)
  assert.deepEqual(precoPorKm({ distanciaM: 12340, valorKm: 2.5, minimo: 10, idaVolta: false }), {
    kmCobrados: 12.3,
    preco: 30.75,
    aplicouMinimo: false,
  });
  // ida e volta dobra os km
  assert.equal(precoPorKm({ distanciaM: 12340, valorKm: 2.5, minimo: 10, idaVolta: true }).kmCobrados, 24.7);
  // corrida curta cai no mínimo
  assert.deepEqual(precoPorKm({ distanciaM: 1500, valorKm: 2, minimo: 15, idaVolta: false }), {
    kmCobrados: 1.5,
    preco: 15,
    aplicouMinimo: true,
  });
});
