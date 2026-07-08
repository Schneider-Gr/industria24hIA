// Inicialização do Sentry no client, antes da hidratação do React.
// Sem DSN o SDK vira no-op. Session Replay fica desligado (custo / LGPD).
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
});

// Breadcrumbs de navegação do App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
