// Cliente do agente LangSmith "Curadoria de seller" (LangGraph Platform,
// deployment próprio). Hoje só redige as dicas de cadastro da LOJA; o parecer
// de produto passou para o Jev (curadoria-jev.ts). O agente só redige texto —
// os gaps (o quê está faltando) já vêm calculados por curadoria-regras.ts.
// Qualquer falha de rede/timeout/parse é não-fatal: retorna null, nunca lança
// — quem chama trata null como "sem sugestão desta vez".

import type { Gap } from "./curadoria-regras";

const API_URL = "https://prod-deepagents-agent-build-d4c1479ed8ce53fbb8c3eefc91f0aa7d.us.langgraph.app";
const ASSISTANT_ID = "bcaec661-e11b-4c75-8efd-a112095ad2b8";

// BOM/espaço no início: mesmo bug real de env var salva via PowerShell/Windows
// que já quebrou o Supabase em prod (ver src/lib/supabase/env.ts).
const clean = (v: string | undefined) => (v ?? "").replace(/^[﻿​]+/, "").trim();

export type DicaLoja = { campo: string; mensagem: string };

async function chamarAgente(mensagem: string): Promise<string | null> {
  const apiKey = clean(process.env.LANGSMITH_API_KEY);
  if (!apiKey) {
    console.error("[curadoria-langsmith] LANGSMITH_API_KEY não configurada");
    return null;
  }

  try {
    const res = await fetch(`${API_URL}/runs/wait`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        input: { messages: [{ role: "user", content: mensagem }] },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      console.error("[curadoria-langsmith] resposta não-ok:", res.status);
      return null;
    }

    const data = (await res.json()) as { messages?: Array<{ content?: unknown }> };
    const ultima = data.messages?.at(-1)?.content;
    return typeof ultima === "string" ? ultima : null;
  } catch (e) {
    console.error("[curadoria-langsmith] falha ao chamar agente:", e);
    return null;
  }
}

export async function gerarDicasLoja(loja: { nome: string }, gaps: Gap[]): Promise<DicaLoja[] | null> {
  if (gaps.length === 0) return [];

  const mensagem = [
    "Você está orientando o dono de uma loja de um marketplace B2B industrial a completar o cadastro.",
    `Nome da loja: ${loja.nome}`,
    "Campos pendentes:",
    ...gaps.map((g) => `- ${g.campo}: ${g.mensagem}`),
    "",
    `Responda com exatamente ${gaps.length} linha(s), uma por campo pendente na mesma ordem acima, no formato "campo: dica curta e prática de como preencher". Não adicione texto antes ou depois das linhas.`,
  ].join("\n");

  const resposta = await chamarAgente(mensagem);
  if (!resposta) return null;

  const linhas = resposta
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const dicas: DicaLoja[] = [];
  for (const gap of gaps) {
    const linha = linhas.find((l) => l.toLowerCase().startsWith(`${gap.campo.toLowerCase()}:`));
    dicas.push({
      campo: gap.campo,
      mensagem: linha ? linha.slice(linha.indexOf(":") + 1).trim() : gap.mensagem,
    });
  }
  return dicas;
}
