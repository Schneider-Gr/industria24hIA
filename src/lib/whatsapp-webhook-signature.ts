import crypto from "node:crypto";

// Assinatura do POST do webhook WhatsApp (Meta): HMAC-SHA256 do body com o
// App Secret, header X-Hub-Signature-256 = "sha256=<hex>". Ver
// developers.facebook.com/docs/graph-api/webhooks/getting-started#validate-payloads.
// Sem App Secret configurado, rejeita tudo (fail-closed) — Issue #384.
export function assinaturaWhatsappValida(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!appSecret) return false;
  const prefixo = "sha256=";
  if (!header || !header.startsWith(prefixo)) return false;
  const esperado = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const recebido = header.slice(prefixo.length);
  try {
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(recebido));
  } catch {
    return false;
  }
}
