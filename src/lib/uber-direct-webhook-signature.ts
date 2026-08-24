import crypto from "node:crypto";

// Assinatura do POST do webhook Uber Direct: HMAC-SHA256 do body com a
// Webhook Signing Key, header x-uber-signature = hex do HMAC (CONFIRMADO
// contra developer.uber.com/docs/deliveries/guides/webhooks, 2026-08-21).
// Sem signing key configurada, rejeita tudo (fail-closed) — mesmo padrão de
// assinaturaWhatsappValida (Issue #384). Antes desta correção, uma signing
// key ausente fazia a função retornar `true` incondicionalmente, aceitando
// qualquer payload não assinado — Issue OWASP #2.
export function assinaturaUberDirectValida(rawBody: string, header: string | null, signingKey: string): boolean {
  if (!signingKey) return false;
  if (!header) return false;
  const esperado = crypto.createHmac("sha256", signingKey).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(header));
  } catch {
    return false;
  }
}
