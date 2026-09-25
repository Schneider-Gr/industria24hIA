import assert from "node:assert/strict";
import { test } from "vitest";
import { classePorPeso, freteAfiliado, pesos, simularProduto } from "./simulador-produto";

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
  assert.deepEqual(freteAfiliado({ distanciaM: 5000, pesoKg: 4, porto: 10 }), { classe: "moto", km: 5, freteKm: 30, total: 40 });
  // 12,34 km de carro a R$ 8 = 98,40 + 2 ajudantes × 50
  assert.deepEqual(freteAfiliado({ distanciaM: 12340, pesoKg: 40, ajudantes: 2, valorAjudante: 50 }), { classe: "carro", km: 12.3, freteKm: 98.4, total: 198.4 });
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
