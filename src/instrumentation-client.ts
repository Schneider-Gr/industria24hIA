// Inicialização do Sentry no client, antes da hidratação do React.
// Sem DSN o SDK vira no-op. Amostragens vêm de env para dar para baixar em
// produção sem novo deploy. Defaults conservadores por custo e LGPD.
import * as Sentry from "@sentry/nextjs";

const num = (v: string | undefined, fallback: number) =>
  v === undefined || v === "" ? fallback : Number(v);

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,

  // Não enviar IP/cookies/headers por padrão (regra de dados sensíveis do projeto).
  sendDefaultPii: false,

  // Tráfego público indexado por bots: sampleRate 1 estoura a quota do plano
  // free (10k transactions/mês) em dias e Sentry passa a descartar erros também.
  tracesSampleRate: num(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0.1),

  integrations: [
    // Session Replay. Mascarado por padrão (LGPD): não grava texto nem mídia.
    // Só grava quando há erro; sessões normais amostradas baixo.
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    // Widget de feedback do usuário, ligado ao evento de erro.
    Sentry.feedbackIntegration({
      colorScheme: "system",
      showBranding: false,
      triggerLabel: "Reportar problema",
      formTitle: "Reportar problema",
      submitButtonLabel: "Enviar",
      messageLabel: "O que aconteceu?",
      messagePlaceholder: "Descreva o problema...",
      successMessageText: "Obrigado pelo retorno.",
    }),
  ],
  replaysSessionSampleRate: num(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_RATE, 0.1),
  replaysOnErrorSampleRate: num(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ERROR_RATE, 1),
});

// Breadcrumbs de navegação do App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
