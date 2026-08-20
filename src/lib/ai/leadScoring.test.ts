import { test } from "vitest";
import assert from "node:assert/strict";
import { parseScoreResponse } from "./leadScoring";

test("parseScoreResponse aceita JSON puro", () => {
  const r = parseScoreResponse('{"score":"quente","resumo":"Quer fechar pedido de 500 telhas essa semana."}');
  assert.deepEqual(r, { score: "quente", resumo: "Quer fechar pedido de 500 telhas essa semana." });
});

test("parseScoreResponse extrai JSON envolto em texto/markdown", () => {
  const r = parseScoreResponse('```json\n{"score":"morno","resumo":"Perguntou preço, sem urgência."}\n```');
  assert.deepEqual(r, { score: "morno", resumo: "Perguntou preço, sem urgência." });
});

test("parseScoreResponse rejeita score fora do enum", () => {
  assert.equal(parseScoreResponse('{"score":"altíssimo","resumo":"x"}'), null);
});

test("parseScoreResponse rejeita resumo vazio", () => {
  assert.equal(parseScoreResponse('{"score":"frio","resumo":"   "}'), null);
});

test("parseScoreResponse rejeita texto sem JSON", () => {
  assert.equal(parseScoreResponse("não consegui analisar"), null);
});
