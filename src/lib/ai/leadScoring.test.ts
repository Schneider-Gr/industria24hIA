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

const MSGS = [{ remetente: "usuario", conteudo: "oi" }];
const jevResponde = (probabilities: Record<string, number>, confidence?: number) => {
  vi.stubEnv("TYPESAFE_API_KEY", "k");
  const fetch = vi.fn(async () => Response.json({ answers: { score: { probabilities, confidence } } }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

test("scoreJev escolhe a opção mais provável e manda a conversa nomeada", async () => {
  const fetch = jevResponde({ quente: 0.1, morno: 0.8, frio: 0.1 }, 0.7);
  assert.equal(await scoreJev(MSGS), "morno");
  const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
  assert.deepEqual(body.state, { conversa: [{ de: "cliente", texto: "oi" }] });
});

test("scoreJev usa o confidence da API: abaixo do mínimo ou ausente, o Claude decide", async () => {
  // Probabilidades folgadas de propósito: quem decide é o confidence devolvido, não um recálculo.
  jevResponde({ quente: 0.9, morno: 0.05, frio: 0.05 }, 0.3);
  assert.equal(await scoreJev(MSGS), null);
  jevResponde({ quente: 0.9, morno: 0.05, frio: 0.05 });
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
