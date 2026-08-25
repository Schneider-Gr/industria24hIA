// Verificação server-side do Cloudflare Turnstile (achado OWASP #8, antes
// adiado por falta de conta Cloudflare — conta criada e widget configurado
// em 2026-08-25). Protege login, cadastro e checkout contra bot/abuso.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Diferente dos webhooks (assinaturaUberDirectValida, assinaturaWhatsappValida),
// esta é uma camada de mitigação best-effort, não um gate de autenticidade de
// dado externo — sem TURNSTILE_SECRET_KEY configurada (dev local, preview sem
// env, etc.) o recurso fica desligado em vez de derrubar login/cadastro/checkout.
export const isTurnstileConfigured = Boolean((process.env.TURNSTILE_SECRET_KEY ?? "").trim());

export async function verificarTurnstile(token: string | null, ip?: string): Promise<boolean> {
  const secret = (process.env.TURNSTILE_SECRET_KEY ?? "").trim();
  if (!secret) return true;
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
