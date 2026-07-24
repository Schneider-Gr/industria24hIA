// Grafo LangGraph — loop gerar-validar-corrigir para aplicar o DESIGN.md
// nas telas do Indústria 24h. Mesmo desenho do piloto langgraph-orcamento-pilot:
//
//   START → propor(LLM reescreve o arquivo) → validar(determinístico)
//              ↑                                   │
//              └────(problemas && iter < MAX)──────┘→ END (ok ou teto)

import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validar as validarRegras } from "./validar.ts";
import { getPrompt, getPromptInfo, traceGeneration, traceScore } from "./langfuse.ts";
import { reportAiValidationFailed } from "./sentry.ts";

export const MAX_ITER = 3;

const DESIGN_MD = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "..", "DESIGN.md"),
  "utf-8",
);

const State = Annotation.Root({
  filePath: Annotation<string>(),
  original: Annotation<string>(),
  codigo: Annotation<string>({ reducer: (_, b) => b, default: () => "" }),
  problemas: Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
  iteracoes: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
  lastTraceId: Annotation<string | null>({ reducer: (_, b) => b, default: () => null }),
  promptMeta: Annotation<{ name: string; version?: number; model: string }>({
    reducer: (_, b) => b,
    default: () => ({ name: "design-loop-propor", model: "claude-haiku-4-5" }),
  }),
});

// Defaults locais; sobrescritos pelo config do prompt gerenciado no Langfuse
// (Prompts → design-loop-propor → Config), editável pela UI sem deploy.
const MODEL_DEFAULTS = { model: "claude-haiku-4-5", temperature: 0.1, maxTokens: 16000 };

function makeModel(config?: Record<string, unknown>) {
  const c = { ...MODEL_DEFAULTS, ...config };
  return new ChatAnthropic({
    model: String(c.model),
    temperature: Number(c.temperature),
    maxTokens: Number(c.maxTokens),
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

// Fallback local do prompt gerenciado "design-loop-propor" (Langfuse, label
// production). Editar o prompt vivo é pelo painel; este const só entra se o
// Langfuse estiver fora ou sem keys. {{design_md}} é injetado pelo código.
const SYSTEM_FALLBACK = `Você aplica um design system em arquivos React/Next.js (Tailwind v4).
Reescreva o arquivo aplicando as regras abaixo. NÃO mude lógica, imports de dados,
props, textos ou estrutura de componentes — só classes/estilo (e className novos).

TOKENS DISPONÍVEIS (já definidos em globals.css @theme):
- Cores: roxo-800 #4C1D95 (primária/header), roxo-900 #3F1C72 (sidebar/nav), roxo-100, roxo-200,
  laranja #F04E23 (CTA primário), laranja-escuro (hover), amarelo #E2AF00 (destaque/ativo),
  teal (apoio), ink (texto), ink-2 (secundário), muted, surface (card), line (borda),
  ok, warn, erro, info. Use como bg-roxo-800, text-muted, border-line etc.
- Fontes: font-display (Cabinet Grotesk — TODO h1/h2 e título de seção),
  font-sans (Instrument Sans, default do body), e a classe utilitária "num"
  (Geist tabular-nums — OBRIGATÓRIA em todo valor R$ e coluna numérica de tabela).

REGRAS DURAS:
- Botão primário: bg-laranja text-white hover:bg-laranja-escuro rounded (4px), font-semibold.
- Botão secundário: bg-roxo-800 text-white. Outline: border-2 border-roxo-800 text-roxo-800.
- Sidebar de painel: bg-roxo-900, item ativo bg-roxo-800 text-white border-l-[3px] border-amarelo.
- Tags de status: retangulares (rounded, 4px), par fundo-claro/texto-escuro (ex.: bg-green-100 text-green-800).
- rounded-full SÓ em avatar. Sem bg-gradient-to-*. Sem blue/indigo/violet/purple/sky/cyan/pink/fuchsia.
- Sem cor arbitrária (bg-[#...], text-[#...]) — use SEMPRE os tokens nomeados acima.
- Radius: rounded (4px) para botões/inputs/tags, rounded-lg (8px) para cards. Nada maior.
- Tabelas: th uppercase text-[11px] tracking-wider text-muted; células numéricas text-right com "num".
- Valores monetários: sempre className com "num" e font-semibold ou font-bold.

DESIGN.md completo para contexto:
{{design_md}}

Devolva SOMENTE o conteúdo completo do arquivo reescrito, sem cercas de código, sem comentários sobre o que mudou.

EXEMPLO DE FORMATO DE SAÍDA — dada a entrada:
  export function Botao() {
    return <button className="bg-blue-600 rounded-full px-4">Salvar</button>;
  }
a saída correta é EXATAMENTE (sem \`\`\`, sem explicação antes ou depois):
export function Botao() {
  return <button className="bg-laranja hover:bg-laranja-escuro text-white font-semibold rounded px-4">Salvar</button>;
}`;

async function propor(state: typeof State.State) {
  const template = await getPrompt("design-loop-propor", SYSTEM_FALLBACK);
  const { version: promptVersion, config } = getPromptInfo("design-loop-propor");
  const model = makeModel(config);
  const partes: string[] = [
    template.replace("{{design_md}}", DESIGN_MD),
    `\nARQUIVO (${state.filePath}):\n${state.original}`,
  ];
  if (state.problemas.length) {
    partes.push(
      `\nSua tentativa anterior teve estes PROBLEMAS detectados pelo validador. Corrija TODOS mantendo o resto:\n- ${state.problemas.join("\n- ")}\n\nTENTATIVA ANTERIOR:\n${state.codigo}`,
    );
  }
  const startTime = new Date().toISOString();
  const out = await model.invoke(partes.join("\n"));
  let codigo = typeof out.content === "string" ? out.content : String(out.content);
  const lastTraceId = await traceGeneration({
    name: "design-loop-propor",
    model: String(config?.model ?? "claude-haiku-4-5"),
    promptName: "design-loop-propor",
    promptVersion,
    tags: ["design-loop", state.filePath],
    // input sem o DESIGN.md inteiro (constante, só infla o trace)
    input: { filePath: state.filePath, iteracao: state.iteracoes + 1, problemas: state.problemas },
    output: codigo.slice(0, 4000),
    startTime,
    endTime: new Date().toISOString(),
    usage: out.usage_metadata
      ? {
          input: out.usage_metadata.input_tokens,
          output: out.usage_metadata.output_tokens,
          total: out.usage_metadata.total_tokens,
        }
      : undefined,
  });
  const promptMeta = {
    name: "design-loop-propor",
    version: promptVersion,
    model: String(config?.model ?? MODEL_DEFAULTS.model),
  };
  // tolerância a cercas apesar da instrução — mas reporta como violação de formato
  const semCercas = codigo.replace(/^\s*```[a-z]*\n/, "").replace(/\n```\s*$/, "");
  if (semCercas !== codigo || semCercas.trim() === "") {
    await reportAiValidationFailed("formato-invalido", {
      promptName: promptMeta.name,
      promptVersion,
      model: promptMeta.model,
      filePath: state.filePath,
      iteracoes: state.iteracoes + 1,
      problemas: semCercas.trim() === "" ? ["output vazio"] : ["output com cerca de código"],
      outputTruncado: codigo,
      langfuseTraceId: lastTraceId,
    });
  }
  codigo = semCercas;
  return { codigo, iteracoes: state.iteracoes + 1, lastTraceId, promptMeta };
}

async function validar(state: typeof State.State) {
  const problemas = validarRegras(state.original, state.codigo);
  // score do validador no trace da geração recém-avaliada (item 5)
  await traceScore(
    state.lastTraceId,
    "problemas-validador",
    problemas.length,
    problemas.length ? problemas.join(" | ").slice(0, 500) : "passou limpo",
  );
  // loop esgotado com problemas pendentes = falha de validação de IA → Sentry
  if (problemas.length && state.iteracoes >= MAX_ITER) {
    await reportAiValidationFailed("loop-esgotado", {
      promptName: state.promptMeta.name,
      promptVersion: state.promptMeta.version,
      model: state.promptMeta.model,
      filePath: state.filePath,
      iteracoes: state.iteracoes,
      problemas,
      outputTruncado: state.codigo,
      langfuseTraceId: state.lastTraceId,
    });
  }
  return { problemas };
}

function rota(state: typeof State.State): typeof END | "propor" {
  if (state.problemas.length === 0) return END;
  if (state.iteracoes >= MAX_ITER) return END;
  return "propor";
}

export const app = new StateGraph(State)
  .addNode("propor", propor)
  .addNode("validar", validar)
  .addEdge(START, "propor")
  .addEdge("propor", "validar")
  .addConditionalEdges("validar", rota, { propor: "propor", [END]: END })
  .compile();
