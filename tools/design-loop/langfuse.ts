// Ingestão mínima do Langfuse (projeto "industria24h") — mesma porta sem SDK
// usada no industro-flow (src/lib/langfuse.server.ts). No-op silencioso se as
// chaves não existirem; NUNCA lança: rastreamento é best-effort e não pode
// derrubar o loop de design.
//
// Env (tools/design-loop/.env, fora do git): LANGFUSE_PUBLIC_KEY,
// LANGFUSE_SECRET_KEY, opcional LANGFUSE_BASE_URL.

import { randomUUID } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// carrega o .env local se o runner não foi invocado com --env-file
if (!process.env.LANGFUSE_PUBLIC_KEY) {
  try {
    process.loadEnvFile(join(dirname(fileURLToPath(import.meta.url)), ".env"));
  } catch {
    // sem .env → segue como no-op
  }
}

const HOST = process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com";
const PK = process.env.LANGFUSE_PUBLIC_KEY;
const SK = process.env.LANGFUSE_SECRET_KEY;

// ── Prompt Management ────────────────────────────────────────────────────────
// Puxa o prompt publicado (label "production"), cache em memória, fallback
// local se o Langfuse cair. Editar no painel → efeito em ≤60s sem deploy.

const PROMPT_TTL_MS = 60_000;
const promptCache = new Map<
  string,
  { text: string; version?: number; config?: Record<string, unknown>; at: number }
>();

export async function getPrompt(name: string, fallback: string): Promise<string> {
  if (!PK || !SK) return fallback;
  const cached = promptCache.get(name);
  if (cached && Date.now() - cached.at < PROMPT_TTL_MS) return cached.text;
  try {
    const res = await fetch(
      `${HOST}/api/public/v2/prompts/${encodeURIComponent(name)}?label=production`,
      { headers: { Authorization: `Basic ${Buffer.from(`${PK}:${SK}`).toString("base64")}` } },
    );
    if (!res.ok) return cached?.text ?? fallback;
    const data = await res.json();
    const text = typeof data.prompt === "string" ? data.prompt : fallback;
    promptCache.set(name, { text, version: data.version, config: data.config, at: Date.now() });
    return text;
  } catch {
    return cached?.text ?? fallback;
  }
}

// versão e config (variáveis de modelo editáveis na UI) do prompt já buscado
export function getPromptInfo(name: string): { version?: number; config?: Record<string, unknown> } {
  const c = promptCache.get(name);
  return { version: c?.version, config: c?.config };
}

// uma sessão Langfuse por invocação do runner → custo/resultado por rodada
export const SESSION_ID = `design-loop-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;

export interface GenerationTrace {
  name: string;
  model: string;
  input: unknown;
  output: unknown;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  usage?: { input?: number; output?: number; total?: number };
  metadata?: Record<string, unknown>;
  tags?: string[]; // ex.: ["design-loop", filePath]
  promptName?: string; // liga a generation à versão do prompt gerenciado
  promptVersion?: number;
}

async function ingest(batch: unknown[]): Promise<void> {
  await fetch(`${HOST}/api/public/ingestion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${PK}:${SK}`).toString("base64")}`,
    },
    body: JSON.stringify({ batch }),
  });
}

// devolve o traceId para permitir score posterior (validador); null se no-op/falha
export async function traceGeneration(g: GenerationTrace): Promise<string | null> {
  if (!PK || !SK) return null;
  try {
    const traceId = randomUUID();
    await ingest([
      {
        id: randomUUID(),
        type: "trace-create",
        timestamp: g.startTime,
        body: {
          id: traceId,
          name: g.name,
          sessionId: SESSION_ID,
          tags: g.tags,
          input: g.input,
          output: g.output,
          metadata: g.metadata,
        },
      },
      {
        id: randomUUID(),
        type: "generation-create",
        timestamp: g.startTime,
        body: {
          id: randomUUID(),
          traceId,
          name: g.name,
          model: g.model,
          promptName: g.promptName,
          promptVersion: g.promptVersion,
          input: g.input,
          output: g.output,
          startTime: g.startTime,
          endTime: g.endTime,
          usage: g.usage ? { ...g.usage, unit: "TOKENS" } : undefined,
          metadata: g.metadata,
        },
      },
    ]);
    return traceId;
  } catch {
    return null; // silêncio proposital — rastreamento é best-effort
  }
}

// score numérico num trace já criado (ex.: nº de problemas do validador)
export async function traceScore(
  traceId: string | null,
  name: string,
  value: number,
  comment?: string,
): Promise<void> {
  if (!PK || !SK || !traceId) return;
  try {
    await ingest([
      {
        id: randomUUID(),
        type: "score-create",
        timestamp: new Date().toISOString(),
        body: { id: randomUUID(), traceId, name, value, comment },
      },
    ]);
  } catch {
    // best-effort
  }
}
