import assert from "node:assert/strict";
import { test } from "vitest";
import { qtdParaPct, simularDestino } from "./simulador-km";

test("frete = km (só ida, a 0,1) × R$/km + porto + ajudantes; % sobre o pedido", () => {
  // Pão de Alho R$ 12,50 × 10 = R$ 125; 4,8 km × R$ 7 = R$ 33,60 → 27%
  const r = simularDestino({ distanciaM: 4800, valorKm: 7, preco: 12.5, qtd: 10 });
  assert.equal(r.km, 4.8);
  assert.equal(r.frete, 33.6);
  assert.equal(r.pedido, 125);
  assert.equal(r.pct, 0.27);
  assert.equal(r.faixa, "inviavel");
  // viável (≤ 20%) a partir de 14 un. (33,60 ÷ 175 = 19,2%); ideal (≤ 10%) a partir de 27 un.
  assert.equal(r.qtdViavel, 14);
  assert.equal(r.qtdIdeal, 27);
});

test("extras entram no frete: porto 10 + 2 ajudantes × 50", () => {
  const r = simularDestino({ distanciaM: 10000, valorKm: 6, preco: 100, qtd: 1, porto: 10, ajudantes: 2, valorAjudante: 50 });
  assert.equal(r.frete, 170);
});

test("faixas: ≤ 10% ótimo, até 20% viável, acima inviável", () => {
  assert.equal(simularDestino({ distanciaM: 1000, valorKm: 10, preco: 100, qtd: 1 }).faixa, "otimo"); // 10%
  assert.equal(simularDestino({ distanciaM: 2000, valorKm: 10, preco: 100, qtd: 1 }).faixa, "viavel"); // 20%
  assert.equal(simularDestino({ distanciaM: 2100, valorKm: 10, preco: 100, qtd: 1 }).faixa, "inviavel"); // 21%
});

test("qtdParaPct: menor quantidade em que o frete fica no limite (sem erro de ponto flutuante)", () => {
  assert.equal(qtdParaPct(40, 25, 0.2), 8); // 40 ÷ (25 × 8) = 20% exatos
  assert.equal(qtdParaPct(33.6, 12.5, 0.2), 14);
  assert.equal(qtdParaPct(0, 12.5, 0.2), 1);
});
