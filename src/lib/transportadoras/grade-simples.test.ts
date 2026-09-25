import assert from "node:assert/strict";
import { test } from "vitest";
import { gradeEmFaixas, validarVeiculos, type Veiculo } from "./grade-simples";

const zonas = [
  { zona: "Norte", cepInicial: 69090000, cepFinal: 69090999 },
  { zona: "Norte", cepInicial: 69093000, cepFinal: 69093999 },
  { zona: "Sul", cepInicial: 69005000, cepFinal: 69005999 },
];

const veiculos: Veiculo[] = [
  { veiculo: "moto", pesoMax: 20, alturaMax: 40, larguraMax: 40, comprimentoMax: 40 },
  { veiculo: "carro", pesoMax: 300, alturaMax: 100, larguraMax: 100, comprimentoMax: 150 },
];

test("cada célula com preço vira uma faixa por faixa de CEP da zona, com peso máximo do veículo", () => {
  const faixas = gradeEmFaixas({
    celulas: [
      { zona: "Norte", veiculo: "moto", preco: 15 },
      { zona: "Norte", veiculo: "carro", preco: 40 },
    ],
    veiculos,
    zonas,
    parametros: { prazoMin: 1, prazoMax: 2, adValorem: 0, icms: 0, freteMinimo: 0, taxaFixa: 0, zonasNaoAtendidas: [] },
  });
  assert.equal(faixas.length, 4);
  assert.deepEqual(
    faixas.map((f) => [f.cepDestinoInicial, f.veiculo, f.pesoMin, f.pesoMax, f.valor]),
    [
      [69090000, "moto", 0, 20, 15],
      [69093000, "moto", 0, 20, 15],
      [69090000, "carro", 0, 300, 40],
      [69093000, "carro", 0, 300, 40],
    ],
  );
  assert.equal(faixas[0].prazoMin, 1);
  assert.equal(faixas[0].prazoMax, 2);
});

test("zona não atendida e célula sem preço não geram faixa; veículo sem limite não gera", () => {
  const faixas = gradeEmFaixas({
    celulas: [
      { zona: "Norte", veiculo: "moto", preco: 15 },
      { zona: "Sul", veiculo: "moto", preco: 18 },
      { zona: "Sul", veiculo: "utilitario", preco: 90 },
    ],
    veiculos,
    zonas,
    parametros: { prazoMin: null, prazoMax: null, adValorem: 0, icms: 0, freteMinimo: 0, taxaFixa: 0, zonasNaoAtendidas: ["Sul"] },
  });
  assert.deepEqual([...new Set(faixas.map((f) => f.cepDestinoInicial))], [69090000, 69093000]);
});

test("parâmetros avançados vão em todas as faixas", () => {
  const [f] = gradeEmFaixas({
    celulas: [{ zona: "Sul", veiculo: "moto", preco: 10 }],
    veiculos,
    zonas,
    parametros: { prazoMin: null, prazoMax: null, adValorem: 1, icms: 12, freteMinimo: 8, taxaFixa: 2, zonasNaoAtendidas: [] },
  });
  assert.deepEqual([f.adValorem, f.icms, f.freteMinimo, f.taxaFixa, f.kgAdicional], [1, 12, 8, 2, 0]);
});

test("limites coerentes passam; veículo menor maior que o maior é recusado", () => {
  assert.deepEqual(validarVeiculos(veiculos), []);
  const erros = validarVeiculos([
    { veiculo: "moto", pesoMax: 50, alturaMax: null, larguraMax: null, comprimentoMax: null },
    { veiculo: "carro", pesoMax: 30, alturaMax: null, larguraMax: null, comprimentoMax: null },
  ]);
  assert.equal(erros.length, 1);
  assert.match(erros[0], /moto.*carro/);
});

test("medida incoerente também é recusada, pulando veículo ausente", () => {
  const erros = validarVeiculos([
    { veiculo: "moto", pesoMax: 20, alturaMax: 200, larguraMax: null, comprimentoMax: null },
    { veiculo: "utilitario", pesoMax: 800, alturaMax: 150, larguraMax: null, comprimentoMax: null },
  ]);
  assert.equal(erros.length, 1);
  assert.match(erros[0], /altura/);
});

test("peso máximo zero ou negativo é recusado", () => {
  assert.equal(validarVeiculos([{ veiculo: "moto", pesoMax: 0, alturaMax: null, larguraMax: null, comprimentoMax: null }]).length, 1);
});
