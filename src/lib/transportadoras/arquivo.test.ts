import assert from "node:assert/strict";
import { test } from "vitest";
import { lerLinhasArquivo } from "./arquivo";
import { criarXlsxDeTeste } from "./xlsx-fixture-test-helper";

test("lerLinhasArquivo lê CSV por extensão .csv", async () => {
  const arquivo = new File(["nome,fonte\nA,interna\n"], "lista.csv", { type: "text/csv" });
  const linhas = await lerLinhasArquivo(arquivo);
  assert.deepEqual(linhas, [{ nome: "A", fonte: "interna" }]);
});

test("lerLinhasArquivo lê XLSX por extensão .xlsx", async () => {
  const bytes = await criarXlsxDeTeste([
    ["nome", "fonte"],
    ["A", "interna"],
  ]);
  const arquivo = new File([bytes as unknown as BlobPart], "lista.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const linhas = await lerLinhasArquivo(arquivo);
  assert.deepEqual(linhas, [{ nome: "A", fonte: "interna" }]);
});

test("lerLinhasArquivo rejeita extensão desconhecida", async () => {
  const arquivo = new File(["x"], "lista.txt");
  await assert.rejects(() => lerLinhasArquivo(arquivo), /\.csv|\.xlsx/i);
});
