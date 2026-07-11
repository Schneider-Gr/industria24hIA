// Inicialização do Sentry no client, antes da hidratação do React.
// Sem DSN o SDK vira no-op. Amostragens vêm de env para dar para baixar em
// produção sem novo deploy. Defaults conservadores por custo e LGPD.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Tráfego público indexado por bots: sampleRate 1 estoura a quota do plano
  // free (10k transactions/mês) em dias e Sentry passa a descartar erros também.
  tracesSampleRate: 0.1,
});

// Breadcrumbs de navegação do App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
