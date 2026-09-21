// Session Replay e widget de feedback do Sentry, fora do pacote inicial.
//
// Importados de forma estática no instrumentation-client, os dois viajavam no
// primeiro chunk da vitrine: 197 KB comprimidos, a maior parte rrweb (medição
// de 21/09). Nenhum dos dois precisa existir antes da primeira pintura, então
// entram depois, quando o navegador está ocioso.
import * as Sentry from "@sentry/nextjs";

const num = (v: string | undefined, fallback: number) =>
  v === undefined || v === "" ? fallback : Number(v);

export function ativarExtrasSentry() {
  Sentry.addIntegration(
    // Mascarado por padrão (LGPD): não grava texto nem mídia.
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  );
  Sentry.addIntegration(
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
  );
}

export const taxasReplay = {
  sessao: num(process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_RATE, 0.1),
  erro: num(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ERROR_RATE, 1),
};
