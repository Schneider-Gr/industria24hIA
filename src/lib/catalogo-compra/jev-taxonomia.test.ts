import assert from "node:assert/strict";
import { test } from "vitest";
import { classificarTaxonomia, type FilhosFn, type PerguntarFn } from "./jev-taxonomia";

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
