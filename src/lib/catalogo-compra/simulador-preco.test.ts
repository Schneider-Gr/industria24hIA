import { test } from "vitest";
import assert from "node:assert/strict";
import {
  compradorPorUnidade,
  curvaDosPrazos,
  custoNoPrazo,
  descontoRecomendado,
  linhasPropostas,
  quantidadeViavel,
} from "./simulador-preco";
import { descontoMaximo } from "./montador-faixas";
import type { Bandas } from "@/lib/logistica-parceiro/simulador-km";

// Change simulador-preco-quantidade-prazo, design D1–D5.
const BANDAS: Bandas = {
  moto: { tarifaMinima: 6, valorKm: 1 }, // até 20 kg
  carro: { tarifaMinima: 8, valorKm: 2 }, // até 300 kg
  caminhao: { tarifaMinima: 20, valorKm: 4 },
};
// Fibra de coco (print da dona): à vista R$ 250, comissão 5%, custo R$ 180, economia 3%/mês.
const FIBRA = { valorAvista: 250, comissaoPct: 5, custoHoje: 180 };

test("custo cai linear com a antecedência", () => {
  assert.equal(custoNoPrazo(180, 3, 0), 180);
  assert.equal(custoNoPrazo(180, 3, 60), 169.2);
  assert.equal(custoNoPrazo(180, 3, 90), 163.8);
  assert.equal(custoNoPrazo(180, 50, 90), 0); // nunca negativo
});

test("desconto recomendado mantém o lucro por unidade de hoje (R$ 57,50)", () => {
  const d = (dias: number) => descontoRecomendado({ ...FIBRA, custoPrazo: custoNoPrazo(180, 3, dias) });
  assert.equal(d(0), 0);
  assert.equal(d(15), 1);
  assert.equal(d(30), 2);
  assert.equal(d(60), 4); // 96% → recebe R$ 228,00 − 169,20 = 58,80 ≥ 57,50; 95% → 225,63 − 169,20 = 56,43
  assert.equal(d(90), 6);
  // já no prejuízo hoje: nada a recomendar
  assert.equal(descontoRecomendado({ ...FIBRA, custoHoje: 300, custoPrazo: 290 }), 0);
});

test("desconto máximo sem prejuízo usa o custo do prazo", () => {
  assert.equal(descontoMaximo({ valorAvista: 250, comissaoPct: 5, custo: custoNoPrazo(180, 3, 60) }), 28);
});

test("comprador paga por unidade: preço + frete/qtd", () => {
  const base = { pesoUnitKg: 33, bandas: BANDAS, km: 15 };
  assert.equal(compradorPorUnidade({ ...base, preco: 250, qtd: 6 }), 255); // 198 kg carro: 15 × 2 = 30
  assert.equal(compradorPorUnidade({ ...base, pesoUnitKg: null, preco: 250, qtd: 6 }), null);
});

test("quantidade viável (joelho): fibra cara e pesada = a própria mínima", () => {
  assert.equal(quantidadeViavel({ valorAvista: 250, pesoUnitKg: 33, bandas: BANDAS, km: 15, qtdMinima: 6 }), 6);
});

test("quantidade viável (joelho): alface barata e leve", () => {
  // 4,50 + 15/q na moto (até 90 un); dobrar 45 → 90 ainda baixa 3,5%; a partir de 46 o dobro
  // já pede carro (R$ 30) e o preço por unidade não cai mais.
  assert.equal(quantidadeViavel({ valorAvista: 4.5, pesoUnitKg: 0.22, bandas: BANDAS, km: 15, qtdMinima: 10 }), 46);
});

test("quantidade viável sem frete = mínima", () => {
  assert.equal(quantidadeViavel({ valorAvista: 4.5, pesoUnitKg: null, bandas: BANDAS, km: 15, qtdMinima: 10 }), 10);
  assert.equal(quantidadeViavel({ valorAvista: 4.5, pesoUnitKg: 0.22, bandas: null, km: 15, qtdMinima: null }), 1);
});

test("linhas: mínima, joelho, 2× e 5× o joelho, até 1000", () => {
  assert.deepEqual(linhasPropostas(10, 46), [10, 46, 92, 230]);
  assert.deepEqual(linhasPropostas(6, 6), [6, 12, 30]);
  assert.deepEqual(linhasPropostas(300, 400), [300, 400, 800]);
});

test("curva dos prazos: só prazos futuros com desconto, do mais distante ao mais próximo", () => {
  assert.deepEqual(
    curvaDosPrazos([
      { dias: 0, descontoPct: 0 },
      { dias: 15, descontoPct: 1 },
      { dias: 30, descontoPct: 0 },
      { dias: 90, descontoPct: 6 },
      { dias: 60, descontoPct: 4 },
    ]),
    [
      { dias_antes: 90, desconto_pct: 6 },
      { dias_antes: 60, desconto_pct: 4 },
      { dias_antes: 15, desconto_pct: 1 },
    ],
  );
});
