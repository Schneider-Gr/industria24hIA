import { test } from "vitest";
import assert from "node:assert/strict";
import {
  custoEquivalente,
  descontoMaximo,
  faixasParaGravar,
  linhaMontador,
  liquidoDe,
  quantidadesPropostas,
} from "./montador-faixas";
import type { Bandas } from "@/lib/logistica-parceiro/simulador-km";

// Change montador-faixas-custo-frete, design D1–D6.
const BANDAS: Bandas = {
  moto: { tarifaMinima: 6, valorKm: 1 },
  carro: { tarifaMinima: 8, valorKm: 2 },
  caminhao: { tarifaMinima: 20, valorKm: 4 },
};
const DIST = [5, 15, 30];
const base = { valorAvista: 4.74, comissaoPct: 5, pesoUnitKg: 0.3, bandas: BANDAS, distanciasKm: DIST };

test("líquido do seller em centavos", () => {
  assert.equal(liquidoDe(4.74, 5), 4.5); // 474 × 95 / 100 = 450,3 → 450
  assert.equal(liquidoDe(13.52, 5), 12.84);
});

test("custo equivalente: custo direto, markup ou nada", () => {
  assert.equal(custoEquivalente({ custo: 2.1, markup: null, liquidoAvista: 4.5 }), 2.1);
  assert.equal(custoEquivalente({ custo: null, markup: 1.3, liquidoAvista: 4.5 }), 3.46);
  assert.equal(custoEquivalente({ custo: null, markup: null, liquidoAvista: 4.5 }), null);
  assert.equal(custoEquivalente({ custo: null, markup: 1, liquidoAvista: 4.5 }), null); // markup ≤ 1 não vale
  assert.equal(custoEquivalente({ custo: 0, markup: 1.3, liquidoAvista: 4.5 }), 3.46); // custo 0 = vazio
});

test("desconto máximo sem ficar abaixo do custo (cenário da spec)", () => {
  assert.equal(descontoMaximo({ valorAvista: 4.74, comissaoPct: 5, custo: 3.46 }), 23);
  assert.equal(descontoMaximo({ valorAvista: 4.74, comissaoPct: 5, custo: 5 }), 0); // à vista já abaixo do custo
  assert.equal(descontoMaximo({ valorAvista: 4.74, comissaoPct: 5, custo: 0.01 }), 90);
  assert.equal(descontoMaximo({ valorAvista: 4.74, comissaoPct: 5, custo: null }), null);
});

test("linha: preço, líquido, markup e frete diluído por distância", () => {
  const l = linhaMontador({ ...base, custo: 3.46, qtd: 100, descontoPct: 10 });
  assert.equal(l.preco, 4.27); // 474 × 90 / 100 = 426,6 → 427
  assert.equal(l.liquido, 4.06); // 427 × 95 / 100 = 405,65 → 406
  assert.equal(l.markup, 1.17);
  assert.equal(l.abaixoCusto, false);
  // 100 un × 0,3 kg = 30 kg → carro; 15 km × R$ 2 = R$ 30 > tarifa 8
  assert.deepEqual(l.fretes?.[1], { total: 30, porUn: 0.3, pct: 0.07, comprador: 4.57 });
  // 5 km × 2 = 10; 30 km × 2 = 60
  assert.deepEqual(l.fretes?.map((f) => f.total), [10, 30, 60]);
});

test("linha pequena: moto e tarifa mínima pesam por unidade", () => {
  const l = linhaMontador({ ...base, custo: null, qtd: 10, descontoPct: 0 });
  // 3 kg → moto; 15 km × 1 = 15 > 6
  assert.deepEqual(l.fretes?.[1], { total: 15, porUn: 1.5, pct: 0.32, comprador: 6.24 });
  assert.equal(l.markup, null);
  assert.equal(l.abaixoCusto, false);
});

test("linha abaixo do custo", () => {
  const l = linhaMontador({ ...base, custo: 3.46, qtd: 50, descontoPct: 30 });
  assert.equal(l.abaixoCusto, true);
});

test("sem peso ou sem bandas: sem frete", () => {
  assert.equal(linhaMontador({ ...base, pesoUnitKg: null, custo: null, qtd: 10, descontoPct: 0 }).fretes, null);
  assert.equal(linhaMontador({ ...base, bandas: null, custo: null, qtd: 10, descontoPct: 0 }).fretes, null);
});

test("quantidades propostas: mínima, viável e ideal no médio, 10× mínima", () => {
  // Médio 15 km, preço 4,74. Moto até 66 un (20 kg): frete R$ 15 → viável (≤ 20%) a partir de 16 un,
  // ideal (≤ 10%) a partir de 32 un. Carro a partir de 67 un: frete R$ 30 = 9,4% em 67 un, segue ideal.
  assert.deepEqual(quantidadesPropostas({ ...base, qtdMinima: 10 }), [10, 16, 32, 100]);
});

test("quantidades propostas sem frete: mínima, 3× e 10×", () => {
  assert.deepEqual(quantidadesPropostas({ ...base, bandas: null, qtdMinima: 12 }), [12, 36, 120]);
  assert.deepEqual(quantidadesPropostas({ ...base, pesoUnitKg: null, qtdMinima: null }), [1, 3, 10]);
});

test("faixas para gravar: só com desconto e acima de 1 un", () => {
  const linhas = [
    linhaMontador({ ...base, custo: null, qtd: 1, descontoPct: 5 }),
    linhaMontador({ ...base, custo: null, qtd: 10, descontoPct: 0 }),
    linhaMontador({ ...base, custo: null, qtd: 50, descontoPct: 5 }),
    linhaMontador({ ...base, custo: null, qtd: 200, descontoPct: 10 }),
  ];
  assert.deepEqual(faixasParaGravar(linhas), [
    { min_qtd: 50, valor_unitario: 4.5, validade: null },
    { min_qtd: 200, valor_unitario: 4.27, validade: null },
  ]);
});
