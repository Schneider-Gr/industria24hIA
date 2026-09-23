import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import { MODELO_JEV, classificarTaxonomia, consultarJev, type FilhosFn, type PerguntarFn } from "./jev-taxonomia";

// Árvore: Construção > Tijolos (folha) | Construção > Pisos (folha) | Alimentos (folha)
const arvore: Record<string, { id: string; nome: string }[]> = {
  raiz: [{ id: "c", nome: "Construção" }, { id: "a", nome: "Alimentos" }],
  c: [{ id: "t", nome: "Tijolos" }, { id: "p", nome: "Pisos" }],
};
const filhos: FilhosFn = async (pai) => arvore[pai ?? "raiz"] ?? [];

// Responde cada pergunta com a distribuição fixada por nome da opção.
const dist: Record<string, number> = { Construção: 0.9, Alimentos: 0.1, Tijolos: 0.8, Pisos: 0.15, nenhuma_destas: 0.05 };
const perguntar: PerguntarFn = async (qs) =>
  Object.fromEntries(
    Object.entries(qs).map(([k, q]) => {
      const opts = Object.keys(q.criteria);
      const ps = opts.map((o) => dist[o] ?? 0);
      const soma = ps.reduce((a, b) => a + b, 0);
      return [k, Object.fromEntries(opts.map((o, i) => [o, ps[i] / soma]))];
    }),
  );

test("desce até a folha mais provável e ordena alternativas pela média geométrica", async () => {
  const r = await classificarTaxonomia({ nome: "Tijolo 6 furos" }, { filhos, perguntar });
  assert.equal(r[0].id, "t");
  assert.equal(r[0].caminho, "Construção > Tijolos");
  assert.ok(Math.abs(r[0].score - Math.sqrt(0.9 * 0.8)) < 1e-9);
  assert.ok(r.every((s, i) => i === 0 || r[i - 1].score >= s.score));
  assert.ok(r.length <= 3);
});

test("nenhuma_destas encerra no nó pai", async () => {
  const soParar: PerguntarFn = async (qs) =>
    Object.fromEntries(Object.entries(qs).map(([k, q]) => [k, Object.fromEntries(Object.keys(q.criteria).map((o) =>
      [o, o === "Construção" || o === "nenhuma_destas" ? 1 : 0]))]));
  const r = await classificarTaxonomia({ nome: "x" }, { filhos, perguntar: soParar });
  assert.equal(r[0].id, "c");
});

test("nome vazio não chama o modelo", async () => {
  const r = await classificarTaxonomia({ nome: "  " }, { filhos, perguntar: async () => { throw new Error("chamou"); } });
  assert.deepEqual(r, []);
});

// Cliente HTTP (#743): retry só em 429/529, modelo travado, confidence da API.
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const Q = { x: { type: "choice" as const, instructions: "?", criteria: { a: null, b: null } } };
const ok = () => Response.json({ answers: { x: { probabilities: { a: 0.9, b: 0.1 }, confidence: 0.8 } } });
const status = (s: number) => new Response("", { status: s });

const comFetch = (...respostas: Response[]) => {
  const fetch = vi.fn(async () => respostas.shift()!);
  vi.stubGlobal("fetch", fetch);
  vi.useFakeTimers();
  return fetch;
};
const rodar = async () => {
  const p = consultarJev("k", {}, Q).then((v) => v, (e: Error) => e);
  await vi.runAllTimersAsync();
  return p;
};

test("consultarJev retenta 529 e devolve probabilidades e confidence", async () => {
  const fetch = comFetch(status(529), ok());
  assert.deepEqual(await rodar(), { x: { probabilities: { a: 0.9, b: 0.1 }, confidence: 0.8 } });
  assert.equal(fetch.mock.calls.length, 2);
  const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
  assert.equal(body.model, MODELO_JEV);
  assert.equal(MODELO_JEV, "jev-1.13.0");
});

test("consultarJev desiste depois de 2 retries em 429", async () => {
  const fetch = comFetch(status(429), status(429), status(429), ok());
  assert.match(String(await rodar()), /TypeSafe 429/);
  assert.equal(fetch.mock.calls.length, 3);
});

test("consultarJev não retenta 401", async () => {
  const fetch = comFetch(status(401), ok());
  assert.match(String(await rodar()), /TypeSafe 401/);
  assert.equal(fetch.mock.calls.length, 1);
});
