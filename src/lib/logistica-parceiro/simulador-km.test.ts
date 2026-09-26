import assert from "node:assert/strict";
import { test } from "vitest";
import {
  bandasDasColunas,
  classePorPeso,
  colunasDasBandas,
  freteRegiao,
  simularRegiao,
  validarBandas,
  type Bandas,
} from "./simulador-km";

const vazias: Bandas = { moto: {}, carro: {}, caminhao: {} };

test("classe pelo peso: moto ≤ 20 kg, carro ≤ 300 kg, caminhão acima", () => {
  assert.equal(classePorPeso(20).classe, "moto");
  assert.equal(classePorPeso(40).classe, "carro");
  assert.equal(classePorPeso(300.1).classe, "caminhao");
});

test("frete da região = maior entre tarifa mínima e km × R$/km da banda + porto + ajudantes", () => {
  const bandas: Bandas = { moto: { tarifaMinima: 40, valorKm: 7 }, carro: { valorKm: 9 }, caminhao: {} };
  // 3 km de moto × 7 = 21 < tarifa 40 → 40
  assert.deepEqual(freteRegiao({ distanciaM: 3000, pesoKg: 4, bandas }), { classe: "moto", km: 3, valorKm: 7, freteKm: 21, tarifaMinima: 40, total: 40 });
  // 10 km × 7 = 70 > 40 → 70 + porto 10 + 2 ajudantes × 50
  assert.equal(freteRegiao({ distanciaM: 10000, pesoKg: 4, bandas, porto: 10, ajudantes: 2, valorAjudante: 50 }).total, 180);
  // banda sem R$/km usa o piso da classe (caminhão R$ 20)
  assert.equal(freteRegiao({ distanciaM: 10000, pesoKg: 400, bandas }).valorKm, 20);
});

test("região: % do pedido, faixa (≤ 10% ótimo, ≤ 20% viável) e quantidades viável e ideal", () => {
  // 0,5 kg/un. de R$ 25; moto R$ 6/km; 5 km + porto 10 = R$ 40
  const r = simularRegiao({ distanciaM: 5000, pesoUnitKg: 0.5, preco: 25, qtd: 1, bandas: vazias, porto: 10 });
  assert.equal(r.frete.total, 40);
  assert.equal(r.pct, 1.6);
  assert.equal(r.faixa, "inviavel");
  assert.equal(r.qtdViavel, 8); // 40 ÷ 200 = 20%
  assert.equal(r.qtdIdeal, 16); // 40 ÷ 400 = 10%
  assert.equal(simularRegiao({ distanciaM: 5000, pesoUnitKg: 0.5, preco: 25, qtd: 16, bandas: vazias, porto: 10 }).faixa, "otimo");
  assert.equal(simularRegiao({ distanciaM: 5000, pesoUnitKg: 0.5, preco: 25, qtd: 8, bandas: vazias, porto: 10 }).faixa, "viavel");
});

test("quantidade viável recalcula o frete: passar de 20 kg troca moto por carro (não é regra de três)", () => {
  // 3 kg/un. de R$ 20, 10 km: 1–6 un. moto (R$ 60), 7+ un. carro (R$ 80) → 20% só com 20 un.
  const r = simularRegiao({ distanciaM: 10000, pesoUnitKg: 3, preco: 20, qtd: 1, bandas: vazias });
  assert.equal(r.qtdViavel, 20);
});

test("nenhuma quantidade até 1000 fica viável → null", () => {
  const r = simularRegiao({ distanciaM: 50000, pesoUnitKg: 30, preco: 1, qtd: 1, bandas: vazias });
  assert.equal(r.qtdViavel, null);
});

test("validarBandas: R$/km abaixo do piso da classe é recusado; vazio é permitido", () => {
  assert.deepEqual(validarBandas({ moto: { valorKm: 6 }, carro: { valorKm: 7.99 }, caminhao: { tarifaMinima: -1 } }), [
    "Carro: R$/km mínimo é R$ 8,00.",
    "Caminhão: tarifa mínima não pode ser negativa.",
  ]);
  assert.deepEqual(validarBandas(vazias), []);
});

test("colunas da 0201 ↔ bandas (numeric do banco chega como string)", () => {
  const b = bandasDasColunas({ valor_km_moto: "6.50" as unknown as number, tarifa_minima_carro: 30 });
  assert.deepEqual(b.moto, { tarifaMinima: null, valorKm: 6.5 });
  assert.equal(colunasDasBandas(b).tarifa_minima_carro, 30);
  assert.equal(colunasDasBandas(b).valor_km_caminhao, null);
});
