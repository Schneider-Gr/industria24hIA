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
