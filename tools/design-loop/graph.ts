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

const PROMPT_NAME = "design-loop-propor";

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
});

function makeModel() {
  // claude-haiku-4-5: rápido/barato, suficiente para reescrita de classes;
  // maxTokens 16k cobre o maior arquivo do projeto com folga.
  return new ChatAnthropic({
    model: "claude-haiku-4-5",
    temperature: 0.1,
    maxTokens: 16000,
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

const SYSTEM_FALLBACK = `Você aplica um design system em arquivos React/Next.js (Tailwind v4).
Reescreva o arquivo aplicando as regras abaixo. NÃO mude lógica, imports de dados,
props, textos ou estrutura de componentes — só classes/estilo (e className novos).

TOKENS DISPONÍVEIS (já definidos em globals.css @theme, identidade "Leroy Merlin" — DESIGN.md 2026-07-29):
- Cores: lm-azul #1E5A8A (CTA primário/ação — a Leroy Merlin usa verde aqui, mas o
  projeto troca deliberadamente por azul), lm-azul-escuro #164569 (hover do CTA),
  lm-marinho #102739 (header/sidebar/marca), lm-cinza #EEEEF0 (fundo neutro),
  lm-amarelo #F8CC1C (destaque de preço/etiqueta), lm-vermelho #B42A27 (alerta/promoção),
  ink (texto), ink-2 (secundário), muted, surface (card), line (borda),
  ok, warn, erro, info. Use como bg-lm-azul, text-muted, border-line etc.
  NUNCA use verde/green — foi propositalmente substituído por azul nesta identidade.
- Fontes: font-display (Archivo 600-800 — todo h1/h2 e título de seção),
  font-sans (Inter, default do body), e a classe utilitária "num"
  (Inter tabular-nums — OBRIGATÓRIA em todo valor R$ e coluna numérica de tabela).

REGRAS DUras:
- Botão primário: bg-lm-azul text-white hover:bg-lm-azul-escuro rounded (4px), font-semibold.
- Botão secundário: bg-lm-marinho text-white. Outline: border-2 border-lm-azul text-lm-azul.
- Sidebar de painel: bg-lm-marinho, item ativo bg-lm-azul text-white border-l-[3px] border-lm-amarelo.
- Tags de status: retangulares (rounded, 4px), par fundo-claro/texto-escuro usando os tokens lm-* (nunca green-100/green-800 — sem família Tailwind default).
- rounded-full SÓ em avatar. Sem bg-gradient-to-*. Sem blue/indigo/violet/purple/sky/cyan/pink/green (fora dos tokens lm-*).
- Radius: rounded (4px) para botões/inputs/tags, rounded-lg (8px) para cards. Nada maior.
- Tabelas: th uppercase text-[11px] tracking-wider text-muted; células numéricas text-right com "num".
- Valores monetários: sempre className com "num" e font-semibold ou font-bold.

DESIGN.md completo para contexto:
{{DESIGN_MD}}

Devolva SOMENTE o conteúdo completo do arquivo reescrito, sem cercas de código, sem comentários sobre o que mudou.`;

async function propor(state: typeof State.State) {
  const model = makeModel();
  const promptBruto = await getPrompt(PROMPT_NAME, SYSTEM_FALLBACK);
  const system = promptBruto.replace("{{DESIGN_MD}}", DESIGN_MD);
  const partes: string[] = [
    system,
    `\nARQUIVO (${state.filePath}):\n${state.original}`,
  ];
  if (state.problemas.length) {
    partes.push(
      `\nSua tentativa anterior teve estes PROBLEMAS detectados pelo validador. Corrija TODOS mantendo o resto:\n- ${state.problemas.join("\n- ")}\n\nTENTATIVA ANTERIOR:\n${state.codigo}`,
    );
  }
  const input = partes.join("\n");
  const startTime = new Date().toISOString();
  const out = await model.invoke(input);
  const endTime = new Date().toISOString();
  let codigo = typeof out.content === "string" ? out.content : String(out.content);
  // tolerância a cercas apesar da instrução
  codigo = codigo.replace(/^\s*```[a-z]*\n/, "").replace(/\n```\s*$/, "");

  const { version } = getPromptInfo(PROMPT_NAME);
  const usage = out.usage_metadata;
  const traceId = await traceGeneration({
    name: "design-loop-propor",
    model: "claude-haiku-4-5",
    input,
    output: codigo,
    startTime,
    endTime,
    usage: usage
      ? { input: usage.input_tokens, output: usage.output_tokens, total: usage.total_tokens }
      : undefined,
    metadata: { filePath: state.filePath, iteracao: state.iteracoes + 1 },
    tags: ["design-loop", state.filePath],
    promptName: PROMPT_NAME,
    promptVersion: version,
  });

  return { codigo, iteracoes: state.iteracoes + 1, lastTraceId: traceId };
}

async function validar(state: typeof State.State) {
  const problemas = validarRegras(state.original, state.codigo);
  await traceScore(
    state.lastTraceId,
    "problemas-validador",
    problemas.length,
    problemas.length ? problemas.join(" | ") : "sem problemas",
  );
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
