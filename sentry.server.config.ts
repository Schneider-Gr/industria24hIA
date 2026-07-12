// Inicialização do Sentry no runtime Node.js (server). Importado por
// src/instrumentation.ts via register(). Sem DSN o SDK vira no-op.
// O tracing do server auto-instrumenta HTTP de saída (chamadas ao Supabase e
// integrações externas), cobrindo #7 sem propagar headers no client (evita CORS).
import * as Sentry from "@sentry/nextjs";

const num = (v: string | undefined, fallback: number) =>
  v === undefined || v === "" ? fallback : Number(v);

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: num(process.env.SENTRY_TRACES_SAMPLE_RATE, 1),
});
