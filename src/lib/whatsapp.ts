/** Normaliza número de WhatsApp cru (import Bubble, sem formato garantido) para dígitos com DDI 55. */
export function normalizeWhatsapp(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

// ============ Envio via WhatsApp Cloud API (Meta) ============
// Sem WHATSAPP_TOKEN/WHATSAPP_PHONE_ID: isWhatsappConfigured=false e o envio
// vira no-op explícito (retorna false; nunca finge que enviou).

const TOKEN = (process.env.WHATSAPP_TOKEN ?? "").replace(/^﻿/, "").trim();
const PHONE_ID = (process.env.WHATSAPP_PHONE_ID ?? "").replace(/^﻿/, "").trim();

export const isWhatsappConfigured = TOKEN.length > 0 && PHONE_ID.length > 0;

// Texto livre só chega a quem falou com o número nas últimas 24h; para
// notificação fria o correto é template aprovado. v1 tenta texto e reporta.
// ponytail: template configurável quando o WABA do industria24h existir.
export async function enviarWhatsapp(telefone: string, texto: string): Promise<boolean> {
  if (!isWhatsappConfigured) return false;
  const numero = normalizeWhatsapp(telefone);
  if (numero.length < 12) return false;
  const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: numero,
      type: "text",
      text: { body: texto },
    }),
  });
  return res.ok;
}

export function mensagemRota(args: {
  origem: string;
  destino: string;
  comissao: string;
  linkMapa: string;
}): string {
  return (
    `🚚 Indústria 24h — nova rota atribuída a você!\n` +
    `Origem: ${args.origem}\n` +
    `Destino: ${args.destino}\n` +
    `Comissão: ${args.comissao}\n` +
    `Trajeto: ${args.linkMapa}\n` +
    `Confirme e atualize o status no seu painel.`
  );
}
