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

  replaysSessionSampleRate: num(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_RATE, 0.1),
  replaysOnErrorSampleRate: num(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ERROR_RATE, 1),
});

// Session Replay e widget de feedback entram depois da primeira pintura
// (ver src/sentry-extras.ts): estáticos, eles pesavam 197 KB comprimidos no
// primeiro chunk da vitrine. Captura de erro e tracing seguem desde o início.
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  const carregar = () => {
    import("./sentry-extras")
      .then((m) => m.ativarExtrasSentry())
      .catch(() => {});
  };
  const ocioso = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void })
    .requestIdleCallback;
  const agendar = (cb: () => void) =>
    ocioso ? ocioso.call(window, cb, { timeout: 5000 }) : window.setTimeout(cb, 3000);
  if (document.readyState === "complete") agendar(carregar);
  else window.addEventListener("load", () => agendar(carregar), { once: true });
}

// Breadcrumbs de navegação do App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
