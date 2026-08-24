import crypto from "node:crypto";

// Comparação constant-time de token/secret recebido contra o valor esperado
// (env var). Mesmo padrão já usado em webhooks/bubblewhats/route.ts — extraído
// aqui para reuso, achado de auditoria OWASP (#4, médio): webhook Asaas
// comparava com `!==` simples.
export function tokenValido(recebido: string | null, esperadoEnv: string): boolean {
  if (!esperadoEnv || !recebido) return false;
  const esperado = Buffer.from(esperadoEnv);
  const dado = Buffer.from(recebido);
  if (esperado.length !== dado.length) return false;
  return crypto.timingSafeEqual(esperado, dado);
}
