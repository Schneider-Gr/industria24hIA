import assert from "node:assert/strict";
import { test } from "vitest";
import {
  classePorPeso,
  freteAfiliado,
  freteTabela,
  pesos,
  simularProduto,
  sugerirMinimo,
  validarBandas,
  bandasDasColunas,
  colunasDasBandas,
  valorKmTeto,
  sugerirValorKm,
  type FaixaFrete,
} from "./simulador-produto";

const tijolo = { pesoKg: 0.5, alturaCm: 10, larguraCm: 10, comprimentoCm: 10, preco: 25 };

test("peso cobrado = maior entre real e cubado (fator 6000), somando as unidades", () => {
  // 30×30×30 = 27.000 cm³ ÷ 6000 = 4,5 kg cubado > 1 kg real
  assert.deepEqual(pesos({ ...tijolo, pesoKg: 1, alturaCm: 30, larguraCm: 30, comprimentoCm: 30 }, 2), { real: 2, cubado: 9, cobrado: 9 });
  assert.deepEqual(pesos(tijolo, 4), { real: 2, cubado: 0.67, cobrado: 2 });
});

test("classe pelo peso real (PRD 054 decisão 17): moto ≤ 20, carro ≤ 300, caminhão acima", () => {
  assert.equal(classePorPeso(20).classe, "moto");
  assert.equal(classePorPeso(40).classe, "carro");
  assert.equal(classePorPeso(300.1).classe, "caminhao");
});

test("frete do afiliado = km × piso da classe + porto + ajudantes", () => {
  // 5 km de moto a R$ 6 = 30 + porto 10 = 40
  assert.deepEqual(freteAfiliado({ distanciaM: 5000, pesoKg: 4, porto: 10 }), { classe: "moto", km: 5, valorKm: 6, freteKm: 30, tarifaMinima: 0, total: 40 });
  // 12,34 km de carro a R$ 8 = 98,40 + 2 ajudantes × 50
  assert.deepEqual(freteAfiliado({ distanciaM: 12340, pesoKg: 40, ajudantes: 2, valorAjudante: 50 }), { classe: "carro", km: 12.3, valorKm: 8, freteKm: 98.4, tarifaMinima: 0, total: 198.4 });
});

test("sugestão: frete de R$ 40 é 160% de um item de R$ 25; com 8 unidades fica em 20%", () => {
  const r = simularProduto({ produto: tijolo, quantidadeMinima: 1, distanciaM: 5000, porto: 10 });
  assert.ok(r.ok);
  assert.equal(r.atual.pct, 1.6);
  assert.equal(r.sugestao, 8);
});

test("sugestão recalcula o frete: passar de 20 kg troca moto por carro", () => {
  // 3 kg por unidade de R$ 20, 10 km: 1–6 un. moto (R$ 60), 7+ un. carro (R$ 80).
  // Regra de três com R$ 60 diria 15 un. (60/300); com carro 80/300 = 26,7% → só 20 un. (80/400).
  const r = simularProduto({ produto: { ...tijolo, pesoKg: 3, preco: 20 }, quantidadeMinima: 1, distanciaM: 10000 });
  assert.ok(r.ok);
  assert.equal(r.sugestao, 20);
});

test("mínimo atual já vale a pena → sugestão é o próprio mínimo", () => {
  const r = simularProduto({ produto: tijolo, quantidadeMinima: 10, distanciaM: 5000, porto: 10 });
  assert.ok(r.ok);
  assert.equal(r.atual.pct, 0.16);
  assert.equal(r.sugestao, 10);
});

test("nenhuma quantidade fica ≤ 20% → sugestão null", () => {
  // o frete cresce junto com a quantidade: 30 kg por unidade de R$ 1 nunca fecha
  const r = simularProduto({ produto: { ...tijolo, pesoKg: 30, preco: 1 }, quantidadeMinima: 1, distanciaM: 50000 });
  assert.ok(r.ok);
  assert.equal(r.sugestao, null);
});

test("sem peso ou medidas não calcula e diz o que falta", () => {
  const r = simularProduto({ produto: { ...tijolo, pesoKg: null, alturaCm: 0 }, quantidadeMinima: 1, distanciaM: 5000 });
  assert.deepEqual(r, { ok: false, faltando: ["peso", "altura"] });
});

const faixa = (o: Partial<FaixaFrete>): FaixaFrete => ({
  transportadoraId: "t1", lojaId: null, cepInicial: "69000000", cepFinal: "69099999", pesoMin: 0, pesoMax: 30, valor: 50, ...o,
});

test("tabela: menor valor entre transportadoras; faixa da loja vence a global da mesma transportadora", () => {
  const faixas = [
    faixa({ valor: 50 }),
    faixa({ valor: 70, lojaId: "L" }), // override da loja: vale 70, não 50
    faixa({ transportadoraId: "t2", valor: 60 }),
  ];
  assert.deepEqual(freteTabela(faixas, "L", "69090-000", 10), { transportadoraId: "t2", valor: 60 });
  // fora do CEP ou do peso → sem frete
  assert.equal(freteTabela(faixas, "L", "69415000", 10), null);
  assert.equal(freteTabela(faixas, "L", "69090000", 31), null);
});

test("sugerirMinimo serve a qualquer fonte e ignora quantidades sem frete", () => {
  // frete fixo 40, item 25: 8 un.
  assert.equal(sugerirMinimo(1, 25, () => 40), 8);
  // sem frete até 9 un. → a primeira com frete que cabe
  assert.equal(sugerirMinimo(1, 25, (q) => (q < 10 ? null : 40)), 10);
  assert.equal(sugerirMinimo(1, 25, () => null), null);
});

test("bandas do produto: frete = maior entre tarifa mínima e km × R$/km da banda do veículo", () => {
  const bandas = { moto: { tarifaMinima: 40, valorKm: 7 }, carro: { valorKm: 9 }, caminhao: {} };
  // 3 km de moto × 7 = 21 < tarifa 40 → 40
  assert.deepEqual(freteAfiliado({ distanciaM: 3000, pesoKg: 4, bandas }), { classe: "moto", km: 3, valorKm: 7, freteKm: 21, tarifaMinima: 40, total: 40 });
  // 10 km × 7 = 70 > 40 → 70, + porto 10
  assert.equal(freteAfiliado({ distanciaM: 10000, pesoKg: 4, bandas, porto: 10 }).total, 80);
  // banda sem R$/km cai no piso da classe (caminhão R$ 20)
  assert.equal(freteAfiliado({ distanciaM: 10000, pesoKg: 400, bandas }).valorKm, 20);
});

test("validarBandas: R$/km abaixo do piso da classe é recusado; vazio é permitido", () => {
  assert.deepEqual(validarBandas({ moto: { valorKm: 6 }, carro: { valorKm: 7.99 }, caminhao: { tarifaMinima: -1 } }), [
    "Carro: R$/km mínimo é R$ 8,00.",
    "Caminhão: tarifa mínima não pode ser negativa.",
  ]);
  assert.deepEqual(validarBandas({ moto: {}, carro: {}, caminhao: {} }), []);
});

test("valorKmTeto: o R$/km que deixa o frete em 20% do pedido na distância", () => {
  // 8 un. × R$ 25 = 200; 20% = 40; porto 10 → 30 ÷ 5 km = R$ 6/km
  assert.equal(valorKmTeto({ distanciaM: 5000, pedido: 200, porto: 10 }), 6);
  assert.equal(valorKmTeto({ distanciaM: 5000, pedido: 20, porto: 10 }), 0);
});

test("colunas da 0201 ↔ bandas (numeric do banco chega como string)", () => {
  const b = bandasDasColunas({ valor_km_moto: "6.50" as unknown as number, tarifa_minima_carro: 30 });
  assert.deepEqual(b.moto, { tarifaMinima: null, valorKm: 6.5 });
  assert.equal(colunasDasBandas(b).tarifa_minima_carro, 30);
  assert.equal(colunasDasBandas(b).valor_km_caminhao, null);
});

test("sugerirValorKm: maior R$/km que cabe em 20% em todos os destinos, nunca abaixo do piso", () => {
  // pedido 200 → 20% = 40; tetos: 5 km → 8,00; 4 km → 10,00 → sugere o menor (8,00)
  assert.deepEqual(sugerirValorKm({ distanciasM: [5000, 4000], pedido: 200, pisoKm: 6 }), { valorKm: 8, destinosAcima: 0 });
  // 20 km → teto 2,00 < piso 6: sugere o piso e conta o destino que fica acima de 20%
  assert.deepEqual(sugerirValorKm({ distanciasM: [5000, 20000], pedido: 200, pisoKm: 6 }), { valorKm: 6, destinosAcima: 1 });
  // arredonda para baixo no centavo (nunca passa de 20%)
  assert.equal(sugerirValorKm({ distanciasM: [3000], pedido: 100, pisoKm: 6 }).valorKm, 6.66);
});
