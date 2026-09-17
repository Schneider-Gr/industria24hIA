// Ingestão mínima do Langfuse (projeto "industria24h") — mesma porta sem SDK
// usada em tools/design-loop/langfuse.ts e no industro-flow. No-op silencioso
// se as chaves não existirem; NUNCA lança nem rejeita: rastreamento é
// best-effort e não pode derrubar curadoria, cadastro ou checkout.
//
// Env (Vercel, Production/Preview): LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY,
// opcional LANGFUSE_BASE_URL. Sem elas o módulo inteiro vira no-op.

import { randomUUID } from "node:crypto";

const HOST = process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com";
const PK = process.env.LANGFUSE_PUBLIC_KEY;
const SK = process.env.LANGFUSE_SECRET_KEY;

export interface GenerationTrace {
  name: string;
  model: string;
  input: unknown;
  output: unknown;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  usage?: { input?: number; output?: number; total?: number };
  metadata?: Record<string, unknown>;
  tags?: string[];
}

// Ao contrário do runner do design-loop, aqui não existe "sessão": cada
// invocação é uma request serverless isolada, e um SESSION_ID de módulo
// misturaria traces de usuários diferentes na mesma instância reaproveitada.
async function ingest(batch: unknown[]): Promise<void> {
  await fetch(`${HOST}/api/public/ingestion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${PK}:${SK}`).toString("base64")}`,
    },
    body: JSON.stringify({ batch }),
    // o trace não pode segurar a resposta ao usuário
    signal: AbortSignal.timeout(5_000),
  });
}

// devolve o traceId (null se no-op ou falha), para permitir score posterior
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

// Evento avulso, sem par input/output de LLM: fallback, decisão de regra,
// caminho que terminou sem gap. Vira um trace simples no Langfuse.
export async function traceEvent(
  name: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!PK || !SK) return;
  try {
    const agora = new Date().toISOString();
    await ingest([
      {
        id: randomUUID(),
        type: "trace-create",
        timestamp: agora,
        body: { id: randomUUID(), name, metadata },
      },
    ]);
  } catch {
    // best-effort
  }
}
