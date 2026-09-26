import assert from "node:assert/strict";
import { test } from "vitest";
import {
  bandasDasColunas,
  classePorPeso,
  colunasDasBandas,
  freteRegiao,
  gradeRegiao,
  eixosGrade,
  balsaDaTravessia,
  quantidadeQueCobre,
  simularRegiao,
  validarBandas,
  type Bandas,
} from "./simulador-km";

const vazias: Bandas = { moto: {}, carro: {}, caminhao: {} };
// Exemplo da spec (#804): cimento 50 kg a R$ 38
const cimento = { pesoUnitKg: 50, preco: 38 };
const bandasCimento: Bandas = { moto: {}, carro: { tarifaMinima: 40, valorKm: 9 }, caminhao: { tarifaMinima: 150, valorKm: 22 } };

test("veículo pelo peso: moto ≤ 20 kg, carro ≤ 300 kg, caminhão acima", () => {
  assert.equal(classePorPeso(20).classe, "moto");
  assert.equal(classePorPeso(40).classe, "carro");
  assert.equal(classePorPeso(300.1).classe, "caminhao");
});

test("frete = maior entre tarifa mínima e km de estrada × R$/km da banda + balsa só de ida", () => {
  // Centro 4,8 km, 10 sacos (500 kg, caminhão): km daria 105,60 < tarifa 150
  const perto = freteRegiao({ distanciaM: 4800, pesoKg: 500, bandas: bandasCimento });
  assert.deepEqual(perto, { classe: "caminhao", km: 4.8, kmBarco: 0, valorKm: 22, freteKm: 105.6, tarifaMinima: 150, balsa: 0, total: 150 });
  // Manaquiri: 157,8 km com 11,9 km de barco → 145,9 km × 22 = 3.209,80 + balsa do caminhão 92,01
  const longe = freteRegiao({ distanciaM: 157800, barcoM: 11900, pesoKg: 500, bandas: bandasCimento, balsa: { moto: 15.34, carro: 46.01, caminhao: 92.01 } });
  assert.equal(longe.km, 145.9);
  assert.equal(longe.kmBarco, 11.9);
  assert.equal(longe.freteKm, 3209.8);
  assert.equal(longe.total, 3301.81);
  // banda sem R$/km usa o piso do veículo
  assert.equal(freteRegiao({ distanciaM: 10000, pesoKg: 400, bandas: vazias }).valorKm, 20);
});

test("região: % do pedido e faixas (≤ 10% ótimo, ≤ 20% viável)", () => {
  const r = simularRegiao({ distanciaM: 4800, ...cimento, qtd: 10, bandas: bandasCimento });
  assert.equal(r.frete.total, 150);
  assert.equal(r.pedido, 380);
  assert.equal(r.pct, 0.39);
  assert.equal(r.faixa, "inviavel");
});

test("viabilidade que fura na troca de veículo: 6 un. (carro) ou a partir de 20 un.", () => {
  const r = simularRegiao({ distanciaM: 4800, ...cimento, qtd: 10, bandas: bandasCimento });
  // 6 un. = 300 kg de carro: 4,8 × 9 = 43,20 → 43,20 ÷ 228 = 19% viável; 7–19 un. caminhão R$ 150 → inviável
  assert.deepEqual(r.viavel, { primeira: 6, primeiraClasse: "carro", estavel: 20 });
  assert.equal(r.ideal.estavel, 40); // 150 ÷ (38 × 40) = 9,9%
});

test("região médio e longe do exemplo", () => {
  const medio = simularRegiao({ distanciaM: 12100, ...cimento, qtd: 10, bandas: bandasCimento });
  assert.equal(medio.frete.total, 266.2);
  assert.deepEqual(medio.viavel, { primeira: 36, primeiraClasse: "caminhao", estavel: 36 });
  assert.equal(medio.ideal.estavel, 71);
  const longe = simularRegiao({ distanciaM: 157800, barcoM: 11900, ...cimento, qtd: 10, bandas: bandasCimento, balsa: { moto: 15.34, carro: 46.01, caminhao: 92.01 } });
  assert.equal(longe.viavel.estavel, 435);
  assert.equal(longe.ideal.estavel, 869);
});

test("nenhuma quantidade até 1000 viável → estavel null", () => {
  const r = simularRegiao({ distanciaM: 50000, pesoUnitKg: 30, preco: 1, qtd: 1, bandas: vazias });
  assert.deepEqual(r.viavel, { primeira: null, primeiraClasse: null, estavel: null });
});

test("grade quantidade × R$/km: % e faixa por célula, aplicando o R$/km ao veículo de cada quantidade", () => {
  const g = gradeRegiao({ distanciaM: 12100, ...cimento, bandas: bandasCimento, quantidades: [10, 40, 80], valoresKm: [20, 22, 25, 30] });
  // 40 un. × R$ 25 = 302,50 ÷ 1.520 = 19,9% → viável; 80 × 22 = 266,20 ÷ 3.040 = 8,8% → ótimo
  assert.equal(g[1][2].pct, 0.2);
  assert.equal(g[1][2].faixa, "viavel");
  assert.equal(g[2][1].faixa, "otimo");
  assert.equal(g[0][0].faixa, "inviavel");
});

test("quantidadeQueCobre: menor quantidade estável que fecha todas as regiões pedidas", () => {
  assert.equal(quantidadeQueCobre([20, 36, 435]), 435);
  assert.equal(quantidadeQueCobre([20, 36]), 36);
  assert.equal(quantidadeQueCobre([20, null]), null);
});

test("validarBandas: R$/km abaixo do piso é recusado; vazio é permitido", () => {
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

test("eixosGrade: quantidades a partir da simulada e R$/km do piso até ~35% acima do atual", () => {
  assert.deepEqual(eixosGrade({ qtd: 10, valorKmAtual: 22, pisoKm: 20 }), { quantidades: [10, 20, 40, 80], valoresKm: [20, 22, 25, 30] });
  // sem duplicar quando o atual é o piso; quantidades limitadas a MAX_QTD
  assert.deepEqual(eixosGrade({ qtd: 400, valorKmAtual: 6, pisoKm: 6 }), { quantidades: [400, 800], valoresKm: [6, 7, 8] });
});

test("balsaDaTravessia: valor por veículo equivalente × fator; fator vazio = sem valor", () => {
  assert.deepEqual(balsaDaTravessia({ valor_equivalente: 30.67, fator_moto: 0.5, fator_carro: 1.5, fator_caminhao: 3 }), {
    moto: 15.34,
    carro: 46.01,
    caminhao: 92.01,
  });
  assert.deepEqual(balsaDaTravessia({ valor_equivalente: 60, fator_moto: null, fator_carro: 1.2, fator_caminhao: null }), {
    moto: null,
    carro: 72,
    caminhao: null,
  });
});
