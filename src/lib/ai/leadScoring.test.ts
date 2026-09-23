import { afterEach, test, vi } from "vitest";
import assert from "node:assert/strict";
import { CONFIANCA_MINIMA, PERGUNTA_SCORE, SCORES, confiancaChoice, parseScoreResponse, scoreJev } from "./leadScoring";

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

const MSGS = [{ remetente: "usuario", conteudo: "oi" }];
const jevResponde = (probabilities: Record<string, number>) => {
  vi.stubEnv("TYPESAFE_API_KEY", "k");
  const fetch = vi.fn(async () => Response.json({ answers: { score: { probabilities } } }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

test("confiancaChoice segue a fórmula da doc TypeSafe", () => {
  assert.equal(confiancaChoice([1, 0, 0]), 1);
  assert.ok(Math.abs(confiancaChoice([1 / 3, 1 / 3, 1 / 3])) < 1e-9);
  assert.ok(Math.abs(confiancaChoice([0.7, 0.2, 0.1]) - 0.55) < 1e-9);
});

test("scoreJev escolhe a opção mais provável e manda a conversa nomeada", async () => {
  const fetch = jevResponde({ quente: 0.1, morno: 0.8, frio: 0.1 });
  assert.equal(await scoreJev(MSGS), "morno");
  const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
  assert.deepEqual(body.state, { conversa: [{ de: "cliente", texto: "oi" }] });
});

test("scoreJev devolve null com confidence abaixo do mínimo (o Claude decide)", async () => {
  jevResponde({ quente: 0.4, morno: 0.35, frio: 0.25 });
  assert.ok(confiancaChoice([0.4, 0.35, 0.25]) < CONFIANCA_MINIMA);
  assert.equal(await scoreJev(MSGS), null);
});

test("scoreJev devolve null sem chave e em erro (o Claude decide)", async () => {
  vi.stubEnv("TYPESAFE_API_KEY", "");
  assert.equal(await scoreJev(MSGS), null);
  vi.stubEnv("TYPESAFE_API_KEY", "k");
  vi.stubGlobal("fetch", async () => new Response("", { status: 401 }));
  vi.spyOn(console, "error").mockImplementation(() => {});
  assert.equal(await scoreJev(MSGS), null);
});
