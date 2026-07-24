// Reporte de falhas de validação de IA ao Sentry (projeto industria24h-web).
// Mesmo contrato do langfuse.ts: best-effort, no-op silencioso sem SENTRY_DSN,
// NUNCA lança. Resolve @sentry/node via node_modules do web (dep transitiva
// de @sentry/nextjs) — sem dependência nova aqui.
//
// Env (tools/design-loop/.env ou ambiente): SENTRY_DSN.

import * as Sentry from "@sentry/node";

const DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
let inited = false;

function ensureInit(): boolean {
  if (!DSN) return false;
  if (!inited) {
    Sentry.init({ dsn: DSN, environment: "design-loop" });
    inited = true;
  }
  return true;
}

export interface LlmInteraction {
  promptName: string;
  promptVersion?: number;
  model: string;
  filePath: string;
  iteracoes: number;
  problemas: string[];
  outputTruncado: string;
  langfuseTraceId: string | null;
}

export async function reportAiValidationFailed(
  motivo: "loop-esgotado" | "formato-invalido",
  ctx: LlmInteraction,
): Promise<void> {
  try {
    if (!ensureInit()) return;
    Sentry.captureMessage(`ai_validation_failed: ${motivo} (${ctx.filePath})`, {
      level: "error",
      tags: {
        ai_validation_failed: "true",
        motivo,
        prompt: ctx.promptName,
        model: ctx.model,
      },
      contexts: {
        llm_interaction: {
          prompt_name: ctx.promptName,
          prompt_version: ctx.promptVersion ?? null,
          model: ctx.model,
          file_path: ctx.filePath,
          iteracoes: ctx.iteracoes,
          problemas: ctx.problemas.slice(0, 20),
          output_truncado: ctx.outputTruncado.slice(0, 2000),
          langfuse_trace_id: ctx.langfuseTraceId,
        },
      },
    });
    await Sentry.flush(3000);
  } catch {
    // best-effort: telemetria nunca derruba o loop
  }
}
