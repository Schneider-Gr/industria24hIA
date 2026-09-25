import assert from "node:assert/strict";
import { test } from "vitest";
import { calcularPendencias, contarCobertos, transportadoraCobre } from "./pendencias";

// Árvore: raiz > construcao > cimento ; raiz > bebidas
const pais = new Map<string, string | null>([
  ["raiz", null],
  ["construcao", "raiz"],
  ["cimento", "construcao"],
  ["bebidas", "raiz"],
]);

test("nó marcado cobre ele e os de baixo; sem nó, cobre tudo", () => {
  assert.equal(transportadoraCobre(new Set(["construcao"]), "cimento", pais), true);
  assert.equal(transportadoraCobre(new Set(["construcao"]), "bebidas", pais), false);
  assert.equal(transportadoraCobre(new Set(), "bebidas", pais), true);
  assert.equal(transportadoraCobre(new Set(), null, pais), true);
  assert.equal(transportadoraCobre(new Set(["construcao"]), null, pais), false);
});

test("contador de produtos cobertos por um nó", () => {
  const produtos = [
    { id: "p1", taxonomiaNoId: "cimento" },
    { id: "p2", taxonomiaNoId: "construcao" },
    { id: "p3", taxonomiaNoId: "bebidas" },
    { id: "p4", taxonomiaNoId: null },
  ];
  assert.equal(contarCobertos("construcao", produtos, pais), 2);
  assert.equal(contarCobertos("raiz", produtos, pais), 3);
});

test("pendências: sem faixa, revisar categorias, sem medidas, sem transportadora, sem CEP de origem", () => {
  const p = calcularPendencias({
    transportadoras: [
      { id: "t1", nome: "Jadlog", ativo: true, faixasAtivas: 0, nos: new Set(["construcao"]), revisarCategorias: false },
      { id: "t2", nome: "Braspress", ativo: true, faixasAtivas: 10, nos: new Set(["construcao"]), revisarCategorias: true },
      { id: "t3", nome: "Parada", ativo: false, faixasAtivas: 0, nos: new Set(), revisarCategorias: false },
    ],
    produtos: [
      { id: "p1", nome: "Cimento", taxonomiaNoId: "cimento", peso: 50, altura: 10, largura: 40, comprimento: 60, cepProduto: "69005-000" },
      { id: "p2", nome: "Guaraná", taxonomiaNoId: "bebidas", peso: 12, altura: 30, largura: 20, comprimento: 30, cepProduto: null },
      { id: "p3", nome: "Areia", taxonomiaNoId: "cimento", peso: null, altura: 1, largura: 1, comprimento: 1, cepProduto: "1" },
    ],
    cepLoja: null,
    pais,
  });
  assert.deepEqual(p.semFaixa.map((t) => t.id), ["t1"]);
  assert.deepEqual(p.revisarCategorias.map((t) => t.id), ["t2"]);
  assert.deepEqual(p.semMedidas.map((x) => x.id), ["p3"]);
  assert.deepEqual(p.semTransportadora.map((x) => x.id), ["p2"]);
  assert.deepEqual(p.semCepOrigem.map((x) => x.id), ["p2", "p3"]);
  assert.equal(p.total, 6);
});

test("sem transportadora ativa com faixa, nenhum produto é marcado como sem transportadora", () => {
  const p = calcularPendencias({
    transportadoras: [],
    produtos: [{ id: "p1", nome: "X", taxonomiaNoId: null, peso: 1, altura: 1, largura: 1, comprimento: 1, cepProduto: "69005000" }],
    cepLoja: null,
    pais,
  });
  assert.equal(p.semTransportadora.length, 0);
  assert.equal(p.total, 0);
});
