import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

const MENSAGEM_GENERICA = "Erro ao processar requisição";

/**
 * Loga o erro real no Sentry e devolve uma mensagem genérica ao client —
 * `error.message` do Postgres/Supabase nunca deve chegar na resposta HTTP.
 */
export function respostaErroGenerico(
  erro: unknown,
  status: number,
  contexto?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
) {
  Sentry.captureException(erro, contexto);
  return NextResponse.json({ error: MENSAGEM_GENERICA }, { status });
}
