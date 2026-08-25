// Verificação server-side do Cloudflare Turnstile (achado OWASP #8, antes
// adiado por falta de conta Cloudflare — conta criada e widget configurado
// em 2026-08-25). Protege cadastro e checkout contra bot/abuso.

import * as Sentry from "@sentry/nextjs";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Diferente dos webhooks (assinaturaUberDirectValida, assinaturaWhatsappValida),
// esta é uma camada de mitigação best-effort, não um gate de autenticidade de
// dado externo — sem TURNSTILE_SECRET_KEY configurada (dev local, preview sem
// env, etc.) o recurso fica desligado em vez de derrubar cadastro/checkout.
export const isTurnstileConfigured = Boolean((process.env.TURNSTILE_SECRET_KEY ?? "").trim());

// Distingue os 3 jeitos de a verificação falhar — sem essa distinção no
// Sentry não dá pra saber se é o widget nunca gerando token (ad-blocker/rede/
// extensão do lado do usuário, sem correção nossa possível) ou uma rejeição
// real do Cloudflare ou de configuração do nosso lado.
async function checarTokenComCloudflare(
  token: string | null,
  ip: string | undefined,
  contexto: string | undefined,
): Promise<boolean> {
  const secret = (process.env.TURNSTILE_SECRET_KEY ?? "").trim();
  if (!secret) return true;

  if (!token) {
    Sentry.captureMessage("Turnstile: token ausente no submit", {
      level: "info",
      tags: { area: "turnstile", motivo: "sem_token", contexto: contexto ?? "desconhecido" },
    });
    return false;
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      Sentry.captureMessage("Turnstile: siteverify respondeu status não-ok", {
        level: "warning",
        tags: { area: "turnstile", motivo: "http_status", contexto: contexto ?? "desconhecido" },
        extra: { status: res.status },
      });
      return false;
    }
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success !== true) {
      Sentry.captureMessage("Turnstile: siteverify rejeitou o token", {
        level: "warning",
        tags: { area: "turnstile", motivo: "rejeitado_cloudflare", contexto: contexto ?? "desconhecido" },
        extra: { errorCodes: data["error-codes"] ?? [] },
      });
      return false;
    }
    return true;
  } catch (erro) {
    Sentry.captureMessage("Turnstile: falha de rede ao chamar siteverify", {
      level: "warning",
      tags: { area: "turnstile", motivo: "falha_rede", contexto: contexto ?? "desconhecido" },
      extra: { erro: erro instanceof Error ? erro.message : String(erro) },
    });
    return false;
  }
}

// Usado por checkout/actions.ts — recebe o IP pra mandar como remoteip.
export async function verificarTurnstile(
  token: string | null,
  ip?: string,
  contexto?: "checkout",
): Promise<boolean> {
  return checarTokenComCloudflare(token, ip, contexto);
}

// Usado por auth-actions.ts (cadastro) — sem IP disponível nesse call site.
export async function validarTurnstile(token: string | null, contexto?: "cadastro"): Promise<boolean> {
  return checarTokenComCloudflare(token, undefined, contexto);
}
