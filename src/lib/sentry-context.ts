import * as Sentry from "@sentry/nextjs";

// Contexto de usuário no Sentry. NUNCA passar e-mail ou outro PII aqui —
// sendDefaultPii:false é decisão deliberada (LGPD) em sentry.server.config.ts/
// sentry.edge.config.ts/instrumentation-client.ts.
export function setSentryUserContext(
  userId: string,
  role?: "admin" | "seller" | "afiliado" | "comprador",
) {
  Sentry.setUser({ id: userId, ...(role ? { role } : {}) });
}

// Convenção para features experimentais: Sentry.setTag("feature_flag", "<nome>")
// no ponto de entrada da feature. Nenhuma tag fixa aqui — aplicar quando a
// próxima feature em beta entrar.
