// Resumo do desconto progressivo exibido no card da vitrine. O que importa:
// faixa vencida ou mais cara que o preço base nunca vira "desconto", e o
// cronômetro de ofertas só existe quando alguma faixa tem validade real.

import assert from "node:assert/strict";
import { test } from "vitest";

import { resumoDescontoProgressivo, validadeMaisProxima } from "./desconto-progressivo";

const HOJE = "2026-09-11";

test("faixa válida vira menor preço, quantidade que ativa e percentual", () => {
  const r = resumoDescontoProgressivo(5.09, [{ min_qtd: 20, valor_unitario: 4.07 }], HOJE);
  assert.deepEqual(r, { menorPreco: 4.07, minQtd: 20, percentual: 20, validade: null });
});

test("faixa vencida é ignorada", () => {
  const r = resumoDescontoProgressivo(10, [{ min_qtd: 5, valor_unitario: 8, validade: "2026-09-10" }], HOJE);
  assert.equal(r, null);
});

test("faixa que vence hoje ainda vale", () => {
  const r = resumoDescontoProgressivo(10, [{ min_qtd: 5, valor_unitario: 8, validade: HOJE }], HOJE);
  assert.equal(r?.validade, HOJE);
});

test("faixa mais cara ou igual ao preço base não é desconto", () => {
  assert.equal(resumoDescontoProgressivo(10, [{ min_qtd: 5, valor_unitario: 12 }], HOJE), null);
  assert.equal(resumoDescontoProgressivo(10, [{ min_qtd: 5, valor_unitario: 10 }], HOJE), null);
});

test("sem faixa, sem desconto", () => {
  assert.equal(resumoDescontoProgressivo(10, [], HOJE), null);
});

test("escolhe o menor preço entre as faixas válidas", () => {
  const r = resumoDescontoProgressivo(
    100,
    [
      { min_qtd: 10, valor_unitario: 95 },
      { min_qtd: 50, valor_unitario: 90, validade: "2026-09-30" },
      { min_qtd: 100, valor_unitario: 80, validade: "2026-09-01" },
    ],
    HOJE,
  );
  assert.deepEqual(r, { menorPreco: 90, minQtd: 50, percentual: 10, validade: "2026-09-30" });
});

test("validade mais próxima ignora ofertas sem validade", () => {
  assert.equal(
    validadeMaisProxima([
      null,
      { menorPreco: 1, minQtd: 1, percentual: 5, validade: null },
      { menorPreco: 1, minQtd: 1, percentual: 5, validade: "2026-09-20" },
      { menorPreco: 1, minQtd: 1, percentual: 5, validade: "2026-09-15" },
    ]),
    "2026-09-15",
  );
  assert.equal(validadeMaisProxima([null, { menorPreco: 1, minQtd: 1, percentual: 5, validade: null }]), null);
});
