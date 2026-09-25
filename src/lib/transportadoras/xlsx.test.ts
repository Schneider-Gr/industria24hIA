import assert from "node:assert/strict";
import { test } from "vitest";
import { parseXlsxLinhas } from "./xlsx";
import { criarXlsxDeTeste } from "./xlsx-fixture-test-helper";

test("parseXlsxLinhas lê a primeira aba com cabeçalho na linha 1", async () => {
  const bytes = await criarXlsxDeTeste([
    ["CEP destino", "Peso (KG)", "Valor Atual Frete"],
    ["04549-000", "0.3", "27.8"],
  ]);
  const linhas = await parseXlsxLinhas(bytes);
  assert.deepEqual(linhas, [{ "CEP destino": "04549-000", "Peso (KG)": "0.3", "Valor Atual Frete": "27.8" }]);
});

test("parseXlsxLinhas ignora linhas totalmente vazias", async () => {
  const bytes = await criarXlsxDeTeste([
    ["nome", "fonte"],
    ["A", "interna"],
    ["", ""],
    ["B", "interna"],
  ]);
  const linhas = await parseXlsxLinhas(bytes);
  assert.equal(linhas.length, 2);
});

test("parseXlsxLinhas devolve string vazia para célula ausente na linha", async () => {
  const bytes = await criarXlsxDeTeste([
    ["a", "b", "c"],
    ["1", "2"],
  ]);
  const linhas = await parseXlsxLinhas(bytes);
  assert.equal(linhas[0].c, "");
});

test("parseXlsxLinhas lê a aba pedida pelo nome quando existe", async () => {
  const { criarXlsxComAbas } = await import("./xlsx-fixture-test-helper");
  const bytes = await criarXlsxComAbas([
    { nome: "Como usar", linhas: [["Instrução"], ["leia"]] },
    { nome: "Faixas", linhas: [["CepInicial", "Valor"], ["69000000", "20"]] },
  ]);
  assert.deepEqual(await parseXlsxLinhas(bytes, "Faixas"), [{ CepInicial: "69000000", Valor: "20" }]);
});

test("parseXlsxLinhas cai na primeira aba quando a pedida não existe", async () => {
  const { criarXlsxComAbas } = await import("./xlsx-fixture-test-helper");
  const bytes = await criarXlsxComAbas([
    { nome: "Tabela", linhas: [["CepInicial"], ["69000000"]] },
    { nome: "Outra", linhas: [["x"], ["y"]] },
  ]);
  assert.deepEqual(await parseXlsxLinhas(bytes, "Faixas"), [{ CepInicial: "69000000" }]);
});
