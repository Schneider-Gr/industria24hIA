// Inicialização do Sentry no runtime Edge (middleware / rotas edge).
// Importado por src/instrumentation.ts via register(). Sem DSN o SDK vira no-op.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
});
