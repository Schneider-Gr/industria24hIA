// Sentry do navegador, inteiro fora do caminho da primeira pintura.
//
// Medição de 22/09 em 4G lento: o núcleo do SDK era 130 KB comprimidos no
// primeiro chunk e a primeira pintura da home levava 8,8s. Aqui ele carrega
// quando o navegador fica ocioso, ou antes disso se um erro acontecer — a
// fila do instrumentation-client reenvia o que ocorreu na janela anterior.
import * as Sentry from "@sentry/nextjs";

const num = (v: string | undefined, fallback: number) =>
  v === undefined || v === "" ? fallback : Number(v);

export function iniciar() {
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
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
      Sentry.feedbackIntegration({
        colorScheme: "system",
        showBranding: false,
        // Só o ícone: o rótulo alargava o botão a ponto de encobrir os demais
        // flutuantes do canto inferior direito (Atendimento do bot).
        triggerLabel: "",
        triggerAriaLabel: "Reportar problema",
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
}

export function capturar(erro: unknown) {
  Sentry.captureException(erro);
}

export function transicaoDeRota(...args: Parameters<typeof Sentry.captureRouterTransitionStart>) {
  return Sentry.captureRouterTransitionStart(...args);
}
