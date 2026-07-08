// Inicialização do Sentry no runtime Node.js (server). Importado por
// src/instrumentation.ts via register(). Sem DSN o SDK vira no-op.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
  // ponytail: amostragem 100% até haver tráfego real; reduzir se volume crescer.
});
