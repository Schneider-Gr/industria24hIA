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

  // #2 Tracing. 100% pré-lançamento; baixar via env quando houver tráfego.
  tracesSampleRate: num(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 1),

  integrations: [
    // #3 Session Replay. Mascarado por padrão (LGPD): não grava texto nem mídia.
    // Só grava quando há erro; sessões normais amostradas baixo.
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    // #8 Widget de feedback do usuário, ligado ao evento de erro.
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
