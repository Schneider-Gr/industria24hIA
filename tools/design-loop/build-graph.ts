// Grafo LangGraph — loop gerar-validar-corrigir para CONSTRUIR telas novas
// (vitrine, afiliado, complementos do seller) a partir de specs. Mesmo desenho
// do design-loop/piloto: propor(LLM) → validar(DETERMINÍSTICO) → corrige com
// feedback concreto até MAX_ITER. O critério de parada nunca é o LLM.

import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_ITER = 3;

const HERE = dirname(fileURLToPath(import.meta.url));
const DESIGN_MD = readFileSync(join(HERE, "..", "..", "DESIGN.md"), "utf-8");

export type Spec = {
  path: string; // relativo a web/
  objetivo: string; // o que a tela faz, em prosa
  contexto: string; // trechos de código/types que o LLM precisa (assinaturas reais)
  required: string[]; // strings que DEVEM aparecer no código gerado
  forbidden?: string[]; // strings proibidas além das globais
  original?: string; // quando é reescrita de arquivo existente
};

const State = Annotation.Root({
  spec: Annotation<Spec>(),
  codigo: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  problemas: Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
  iteracoes: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
});

function makeModel() {
  // sonnet: gerar tela inteira com queries reais exige mais que reescrita de classes
  return new ChatAnthropic({
    model: "claude-sonnet-5", // não aceita temperature (400 se enviar)
    maxTokens: 24000,
    streaming: true, // SDK exige streaming acima de ~16k tokens de saída
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

const SYSTEM = `Você constrói telas Next.js 16 (App Router, TS, Tailwind v4) do marketplace Indústria 24h.
Devolva SÓ o conteúdo completo do arquivo pedido — sem markdown, sem explicação.

CONVENÇÕES DO PROJETO (obrigatórias):
- Server Component por padrão; "use client" só quando há estado/efeito.
- Dados SEMPRE via Supabase: import { createClient } from "@/lib/supabase/server";
  const supabase = await createClient(); RLS decide o que aparece. PROIBIDO mock.
- Next 16: em rotas dinâmicas, params é Promise → const { id } = await params;
- Erro → <ErrorState title detail /> de "@/components/ErrorState". Lista vazia →
  estado vazio honesto em texto. Nunca esconder falha com dado inventado.
- Texto de UI em português. Valores em R$ com a classe "num" e
  formatBRL de "@/components/seller/format".
- Server Actions em actions.ts separado com "use server" no topo,
  revalidatePath após escrita.

DESIGN SYSTEM (resumo do DESIGN.md; tokens já existem no globals.css):
${DESIGN_MD.slice(0, 3200)}

REGRAS DURAS DE ESTILO (identidade "Leroy Merlin", DESIGN.md 2026-07-29): botão primário
bg-lm-azul text-white hover:bg-lm-azul-escuro rounded font-semibold; header/nav bg-lm-marinho;
sidebar bg-lm-marinho com item ativo bg-lm-azul border-l-[3px] border-lm-amarelo; tags de
status retangulares (rounded 4px) fundo-claro/texto-escuro com tokens lm-*; rounded-full só
avatar; sem gradiente; sem blue/indigo/violet/purple/sky/cyan/pink/green fora dos tokens lm-*
(o projeto troca deliberadamente verde por azul — nunca use green); preço SEMPRE
font-semibold com classe num.`;

async function propor(state: typeof State.State) {
  const s = state.spec;
  const feedback = state.problemas.length
    ? `\n\nSUA TENTATIVA ANTERIOR FOI REJEITADA. Corrija exatamente isto:\n${state.problemas.map((p) => `- ${p}`).join("\n")}\n\nTENTATIVA ANTERIOR:\n${state.codigo}`
    : "";
  const original = s.original ? `\n\nARQUIVO ATUAL (preserve exports e lógica existente; ADICIONE o pedido):\n${s.original}` : "";
  const res = await makeModel().invoke([
    ["system", SYSTEM],
    [
      "human",
      `Arquivo: ${s.path}\n\nOBJETIVO:\n${s.objetivo}\n\nCONTEXTO REAL DO PROJETO (assinaturas/types/colunas — use exatamente estes nomes):\n${s.contexto}${original}${feedback}`,
    ],
  ]);
  // com streaming, content pode vir como array de blocos
  const texto =
    typeof res.content === "string"
      ? res.content
      : (res.content as Array<{ type: string; text?: string }>)
          .map((b) => b.text ?? "")
          .join("");
  const codigo = texto.replace(/^\s*```[a-z]*\n?/, "").replace(/\n?```\s*$/, "");
  return { codigo, iteracoes: state.iteracoes + 1 };
}

const PROIBIDAS_GLOBAIS = [
  "bg-gradient-to-",
  "lorem ipsum",
  "placeholder.com",
  "example.com/img",
];

function validar(state: typeof State.State) {
  const { spec, codigo } = state;
  const problemas: string[] = [];
  if (/^\s*```/.test(codigo)) problemas.push("Saída contém cerca markdown; devolva só o arquivo.");
  if (codigo.length < 400) problemas.push("Arquivo suspeito de incompleto (<400 chars).");
  for (const r of spec.required)
    if (!codigo.includes(r)) problemas.push(`Falta obrigatório no código: ${JSON.stringify(r)}`);
  for (const f of [...PROIBIDAS_GLOBAIS, ...(spec.forbidden ?? [])])
    if (codigo.includes(f)) problemas.push(`Proibido no código: ${JSON.stringify(f)}`);
  const cores = codigo.match(
    /\b(?:bg|text|border|ring|from|to)-(?:blue|indigo|purple|violet|fuchsia|pink|sky|cyan|green|emerald|lime|roxo|laranja|amarelo|teal|aco|sinal|verde)(?:-[a-z0-9]+)?\b/g,
  );
  if (cores?.length) problemas.push(`Cores fora da paleta: ${[...new Set(cores)].join(", ")} — use lm-azul, lm-azul-escuro, lm-marinho, lm-cinza, lm-amarelo, lm-vermelho.`);
  if (spec.original) {
    const exps = spec.original.match(/export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class)\s+(\w+)/g) ?? [];
    for (const e of exps) {
      const nome = e.match(/(\w+)\s*$/)?.[1];
      if (nome && !codigo.includes(nome)) problemas.push(`Export "${nome}" do arquivo original sumiu.`);
    }
  }
  // mock hardcoded: array de objetos com aspas fora de contexto de config
  if (/const\s+\w+\s*=\s*\[\s*\{\s*(?:id|nome|title|name)\s*:\s*["']/.test(codigo))
    problemas.push("Parece haver dados mockados hardcoded — busque do Supabase.");
  return { problemas };
}

function decidir(state: typeof State.State) {
  if (state.problemas.length === 0) return END;
  if (state.iteracoes >= MAX_ITER) return END;
  return "propor";
}

export const buildApp = new StateGraph(State)
  .addNode("propor", propor)
  .addNode("validar", validar)
  .addEdge(START, "propor")
  .addEdge("propor", "validar")
  .addConditionalEdges("validar", decidir, ["propor", END])
  .compile();
