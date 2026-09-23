import { afterEach, test, vi } from "vitest";
import assert from "node:assert/strict";
import { PERGUNTA_SCORE, SCORES, parseScoreResponse, scoreJev } from "./leadScoring";

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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// leads.score só aceita estes valores: as opções do Jev têm que bater com o enum.
test("opções do Jev batem com SCORES", () => {
  assert.deepEqual(Object.keys(PERGUNTA_SCORE.criteria).sort(), [...SCORES].sort());
});

test("scoreJev escolhe a opção mais provável", async () => {
  vi.stubEnv("TYPESAFE_API_KEY", "k");
  vi.stubGlobal("fetch", async () =>
    Response.json({ answers: { score: { probabilities: { quente: 0.2, morno: 0.7, frio: 0.1 } } } }),
  );
  assert.equal(await scoreJev("Cliente: oi"), "morno");
});

test("scoreJev devolve null sem chave e em erro (o Claude decide)", async () => {
  vi.stubEnv("TYPESAFE_API_KEY", "");
  assert.equal(await scoreJev("Cliente: oi"), null);
  vi.stubEnv("TYPESAFE_API_KEY", "k");
  vi.stubGlobal("fetch", async () => new Response("", { status: 401 }));
  vi.spyOn(console, "error").mockImplementation(() => {});
  assert.equal(await scoreJev("Cliente: oi"), null);
});
