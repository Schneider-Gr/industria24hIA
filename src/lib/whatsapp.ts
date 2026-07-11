/** Normaliza número de WhatsApp cru (import Bubble, sem formato garantido) para dígitos com DDI 55. */
export function normalizeWhatsapp(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}
