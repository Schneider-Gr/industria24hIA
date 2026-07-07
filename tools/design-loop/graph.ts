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

const SYSTEM = `Você aplica um design system em arquivos React/Next.js (Tailwind v4).
Reescreva o arquivo aplicando as regras abaixo. NÃO mude lógica, imports de dados,
props, textos ou estrutura de componentes — só classes/estilo (e className novos).

TOKENS DISPONÍVEIS (já definidos em globals.css @theme):
- Cores: roxo-800 #4C1D95 (primária/header), roxo-900 #3F1C72 (sidebar/nav), roxo-100,
  laranja #F04E23 (CTA primário), laranja-escuro (hover), amarelo #E2AF00 (destaque/ativo),
  teal (apoio), ink (texto), ink-2 (secundário), muted, surface (card), line (borda),
  ok, warn, erro, info. Use como bg-roxo-800, text-muted, border-line etc.
- Fontes: font-display (Cabinet Grotesk — TODO h1/h2 e título de seção),
  font-sans (Instrument Sans, default do body), e a classe utilitária "num"
  (Geist tabular-nums — OBRIGATÓRIA em todo valor R$ e coluna numérica de tabela).

REGRAS DUras:
- Botão primário: bg-laranja text-white hover:bg-laranja-escuro rounded (4px), font-semibold.
- Botão secundário: bg-roxo-800 text-white. Outline: border-2 border-roxo-800 text-roxo-800.
- Sidebar de painel: bg-roxo-900, item ativo bg-roxo-800 text-white border-l-[3px] border-amarelo.
- Tags de status: retangulares (rounded, 4px), par fundo-claro/texto-escuro (ex.: bg-green-100 text-green-800).
- rounded-full SÓ em avatar. Sem bg-gradient-to-*. Sem blue/indigo/violet/purple/sky/cyan/pink.
- Radius: rounded (4px) para botões/inputs/tags, rounded-lg (8px) para cards. Nada maior.
- Tabelas: th uppercase text-[11px] tracking-wider text-muted; células numéricas text-right com "num".
- Valores monetários: sempre className com "num" e font-semibold ou font-bold.

DESIGN.md completo para contexto:
${DESIGN_MD}

Devolva SOMENTE o conteúdo completo do arquivo reescrito, sem cercas de código, sem comentários sobre o que mudou.`;

async function propor(state: typeof State.State) {
  const model = makeModel();
  const partes: string[] = [
    SYSTEM,
    `\nARQUIVO (${state.filePath}):\n${state.original}`,
  ];
  if (state.problemas.length) {
    partes.push(
      `\nSua tentativa anterior teve estes PROBLEMAS detectados pelo validador. Corrija TODOS mantendo o resto:\n- ${state.problemas.join("\n- ")}\n\nTENTATIVA ANTERIOR:\n${state.codigo}`,
    );
  }
  const out = await model.invoke(partes.join("\n"));
  let codigo = typeof out.content === "string" ? out.content : String(out.content);
  // tolerância a cercas apesar da instrução
  codigo = codigo.replace(/^\s*```[a-z]*\n/, "").replace(/\n```\s*$/, "");
  return { codigo, iteracoes: state.iteracoes + 1 };
}

function validar(state: typeof State.State) {
  return { problemas: validarRegras(state.original, state.codigo) };
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
