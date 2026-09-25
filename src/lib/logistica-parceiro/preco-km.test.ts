import assert from "node:assert/strict";
import { test } from "vitest";
import { PISO_KM_PADRAO, precoPorKm } from "./preco-km";

test("preço por km (PRD 053): só ida, km a 0,1, piso por km", () => {
  // 12,34 km → 12,3 km cobrados × R$ 6,50 = R$ 79,95
  assert.deepEqual(precoPorKm({ distanciaM: 12340, valorKm: 6.5 }), { ok: true, kmCobrados: 12.3, preco: 79.95 });
  // no piso passa
  assert.equal(precoPorKm({ distanciaM: 1000, valorKm: PISO_KM_PADRAO }).ok, true);
  // abaixo do piso recusa
  assert.deepEqual(precoPorKm({ distanciaM: 1000, valorKm: 5.99 }), { ok: false, piso: 6 });
  // piso da loja sobrepõe o padrão
  assert.deepEqual(precoPorKm({ distanciaM: 1000, valorKm: 7, pisoKm: 8 }), { ok: false, piso: 8 });
});
