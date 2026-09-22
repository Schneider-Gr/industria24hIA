// Classifica um produto na taxonomia_nos com o Jev (TypeSafe System One):
// um Choice por nível, beam search de largura 3, score = média geométrica das
// probabilidades do caminho (cookbook hierarchical_classification da TypeSafe).
// Nada é gravado; o seller confirma no TaxonomiaPicker.
// Eval de 21/09 (30 produtos reais, scripts/jev-taxonomia-eval.mjs):
// ~4,5 chamadas, ~6k tokens e ~1,6s por produto.

export type SugestaoJev = { id: string; caminho: string; score: number };
type No = { id: string; nome: string };
type Choice = { type: "choice"; instructions: string; criteria: Record<string, string | null> };
export type FilhosFn = (pai: string | null) => Promise<No[]>;
/** Recebe as perguntas de um nível e devolve as probabilidades de cada uma. */
export type PerguntarFn = (qs: Record<string, Choice>) => Promise<Record<string, Record<string, number>>>;

const K = 3;
const PARAR = "nenhuma_destas";
type Caminho = { nos: No[]; ps: number[]; fim: boolean };

const score = (ps: number[]) => Math.exp(ps.reduce((a, p) => a + Math.log(Math.max(p, 1e-9)), 0) / ps.length);

export async function classificarTaxonomia(
  produto: { nome: string; descricao?: string },
  { filhos, perguntar }: { filhos: FilhosFn; perguntar: PerguntarFn },
): Promise<SugestaoJev[]> {
  if (!produto.nome.trim()) return [];
  let beam: Caminho[] = [{ nos: [], ps: [], fim: false }];
  for (let nivel = 0; nivel < 8 && beam.some((b) => !b.fim); nivel++) {
    const abertos = beam.filter((b) => !b.fim);
    // Nomes repetidos entre irmãos viram chaves distintas (a chave é a opção do Choice).
    const porChave = await Promise.all(
      abertos.map(async (b) => {
        const m = new Map<string, No>();
        for (const f of await filhos(b.nos.at(-1)?.id ?? null)) m.set(m.has(f.nome) ? `${f.nome} (${f.id.slice(0, 4)})` : f.nome, f);
        return m;
      }),
    );
    const qs: Record<string, Choice> = {};
    abertos.forEach((b, i) => {
      const pai = b.nos.at(-1);
      const criteria: Record<string, string | null> = Object.fromEntries([...porChave[i].keys()].map((k) => [k, null]));
      if (pai) criteria[PARAR] = `Nenhuma subcategoria de "${pai.nome}" descreve o produto melhor que ela própria`;
      qs[`b${i}`] = {
        type: "choice",
        instructions: pai
          ? `O \`produto\` está em "${pai.nome}". Qual subcategoria o descreve?`
          : "Em qual categoria de marketplace B2B este `produto` se encaixa?",
        criteria,
      };
    });
    const res = await perguntar(qs);
    const cand = beam.filter((b) => b.fim);
    abertos.forEach((b, i) => {
      for (const [opt, p] of Object.entries(res[`b${i}`])) {
        const f = porChave[i].get(opt);
        if (f) cand.push({ nos: [...b.nos, f], ps: [...b.ps, p], fim: false });
        else if (b.nos.length) cand.push({ ...b, ps: [...b.ps, p], fim: true });
      }
    });
    beam = cand.sort((a, b) => score(b.ps) - score(a.ps)).slice(0, K);
    // Folha = sem filhos; descobre agora para não gastar uma pergunta vazia.
    await Promise.all(beam.filter((b) => !b.fim).map(async (b) => { b.fim = (await filhos(b.nos.at(-1)!.id)).length === 0; }));
  }
  return beam
    .filter((b) => b.nos.length)
    .map((b) => ({ id: b.nos.at(-1)!.id, caminho: b.nos.map((n) => n.nome).join(" > "), score: score(b.ps) }));
}

/** Cliente HTTP do TypeSafe (POST /v1/systemone). */
export function perguntarTypeSafe(apiKey: string, state: unknown): PerguntarFn {
  return async (questions) => {
    const r = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ state, model: "jev-latest", questions }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) throw new Error(`TypeSafe ${r.status}`);
    const { answers } = (await r.json()) as { answers: Record<string, { probabilities: Record<string, number> }> };
    return Object.fromEntries(Object.entries(answers).map(([k, a]) => [k, a.probabilities]));
  };
}
