import { afterEach, test, vi } from "vitest";
import assert from "node:assert/strict";
import { PERGUNTA_PERSONA_JEV, personaJev } from "./personaJev";
import { PERSONAS } from "./systemPrompt";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const jevResponde = (probabilities: Record<string, number>, confidence: number) => {
  vi.stubEnv("TYPESAFE_API_KEY", "k");
  const fetch = vi.fn(async () => Response.json({ answers: { persona: { probabilities, confidence } } }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

// bot_conversas.persona tem check com estas 4: opção nova no Jev tem que existir no banco.
test("opções do Jev = PERSONAS + indefinido", () => {
  assert.deepEqual(Object.keys(PERGUNTA_PERSONA_JEV.criteria).sort(), [...PERSONAS, "indefinido"].sort());
});

test("personaJev decide com confidence alta e manda a mensagem no state", async () => {
  const fetch = jevResponde({ consumidor: 0, seller: 1, motorista: 0, afiliado: 0, indefinido: 0 }, 1);
  assert.equal(await personaJev("sou lojista"), "seller");
  const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
  assert.deepEqual(body.state, { mensagem: "sou lojista" });
});

test("personaJev devolve null para indefinido, confidence baixa, sem chave e erro (o bot pergunta)", async () => {
  jevResponde({ consumidor: 0, seller: 0, motorista: 0, afiliado: 0, indefinido: 1 }, 1);
  assert.equal(await personaJev("oi"), null);
  jevResponde({ consumidor: 0.7, seller: 0.3, motorista: 0, afiliado: 0, indefinido: 0 }, 0.64);
  assert.equal(await personaJev("compra futura"), null);
  vi.stubEnv("TYPESAFE_API_KEY", "");
  assert.equal(await personaJev("sou lojista"), null);
  vi.stubEnv("TYPESAFE_API_KEY", "k");
  vi.stubGlobal("fetch", async () => new Response("", { status: 401 }));
  vi.spyOn(console, "error").mockImplementation(() => {});
  assert.equal(await personaJev("sou lojista"), null);
});
