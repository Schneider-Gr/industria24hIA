// Avaliação offline: Jev (TypeSafe) classificando produtos na taxonomia_nos via beam search.
// Uso: node scripts/jev-taxonomia-eval.mjs <dump.json> <saida.csv>
// dump = saída de `supabase db query -o json` com {nos, prods}. Não grava nada no banco.
import { readFileSync, writeFileSync } from "node:fs";

const [dumpPath, outPath] = process.argv.slice(2);
const KEY = readFileSync(".env.local", "utf8").match(/^TYPESAFE_API_KEY=(.*)$/m)[1].trim().replace(/^"|"$/g, "");
const K = 3; // largura do beam
const PARAR = "nenhuma_destas";

const { nos, prods } = JSON.parse(readFileSync(dumpPath, "utf8")).rows[0].j;
const filhos = new Map();
for (const n of nos) {
  const k = n.p ?? "raiz";
  if (!filhos.has(k)) filhos.set(k, []);
  filhos.get(k).push(n);
}
const nome = new Map(nos.map((n) => [n.id, n.n]));

async function systemOne(state, questions) {
  for (let t = 0; t < 4; t++) {
    const r = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ state, model: "jev-latest", questions }),
    });
    if (r.ok) return r.json();
    if (r.status < 500 && r.status !== 429) throw new Error(`${r.status} ${await r.text()}`);
    await new Promise((ok) => setTimeout(ok, 1000 * 2 ** t));
  }
  throw new Error("TypeSafe indisponível");
}

function pergunta(parentId, opcoes) {
  const criteria = {};
  for (const o of opcoes) criteria[o.n] = null;
  if (parentId !== "raiz") criteria[PARAR] = `Nenhuma subcategoria de "${nome.get(parentId)}" descreve o produto melhor que ela própria`;
  return {
    type: "choice",
    instructions: parentId === "raiz"
      ? "Em qual categoria de marketplace B2B este `produto` se encaixa?"
      : `O \`produto\` está em "${nome.get(parentId)}". Qual subcategoria o descreve?`,
    criteria,
  };
}

const score = (ps) => Math.exp(ps.reduce((a, p) => a + Math.log(Math.max(p, 1e-9)), 0) / ps.length);

async function classificar(prod) {
  const state = { produto: { nome: prod.nome, descricao: prod.d, categoria_do_seller: prod.cat, subcategoria_do_seller: prod.sub } };
  let beam = [{ ids: [], ps: [], fim: false }];
  let tokens = 0, chamadas = 0;
  while (beam.some((b) => !b.fim)) {
    const abertos = beam.filter((b) => !b.fim);
    const qs = {};
    abertos.forEach((b, i) => {
      const pai = b.ids.at(-1) ?? "raiz";
      qs[`b${i}`] = pergunta(pai, filhos.get(pai));
    });
    const res = await systemOne(state, qs);
    chamadas++; tokens += res.usage.input_tokens + res.usage.output_tokens;
    const cand = beam.filter((b) => b.fim);
    abertos.forEach((b, i) => {
      const pai = b.ids.at(-1) ?? "raiz";
      const porNome = new Map(filhos.get(pai).map((f) => [f.n, f]));
      for (const [opt, p] of Object.entries(res.answers[`b${i}`].probabilities)) {
        if (opt === PARAR) { cand.push({ ...b, ps: [...b.ps, p], fim: true }); continue; }
        const f = porNome.get(opt);
        cand.push({ ids: [...b.ids, f.id], ps: [...b.ps, p], fim: !filhos.has(f.id) });
      }
    });
    beam = cand.sort((a, b) => score(b.ps) - score(a.ps)).slice(0, K);
  }
  const [top, seg] = beam;
  return {
    caminho: top.ids.map((id) => nome.get(id)).join(" > "),
    no_id: top.ids.at(-1),
    score: score(top.ps),
    separacao: seg ? score(top.ps) / score(seg.ps) : Infinity,
    alternativa: seg?.ids.map((id) => nome.get(id)).join(" > ") ?? "",
    chamadas, tokens,
  };
}

const linhas = [];
for (let i = 0; i < prods.length; i += 5) {
  const lote = await Promise.all(prods.slice(i, i + 5).map(async (p) => {
    const t0 = Date.now();
    try { return { p, r: await classificar(p), ms: Date.now() - t0 }; }
    catch (e) { return { p, erro: String(e.message).slice(0, 200) }; }
  }));
  for (const { p, r, ms, erro } of lote) {
    console.log(erro ? `ERRO ${p.nome}: ${erro}` : `${r.score.toFixed(2)} ${p.nome} -> ${r.caminho}`);
    linhas.push(erro ? [p.id, p.nome, p.cat, p.sub, "ERRO", "", "", "", erro, "", ""]
      : [p.id, p.nome, p.cat, p.sub, r.caminho, r.score.toFixed(3), r.separacao.toFixed(2), r.alternativa, r.chamadas, r.tokens, ms]);
  }
}
const csv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
writeFileSync(outPath, "﻿" + [["produto_id", "produto", "categoria", "subcategoria", "jev_caminho", "score", "separacao", "alternativa", "chamadas", "tokens", "ms"], ...linhas].map((l) => l.map(csv).join(";")).join("\n"));
