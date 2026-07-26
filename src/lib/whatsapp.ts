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

// Código de retirada/entrega vai SÓ para o comprador: se seller/entregador
// recebessem o código, a confirmação deixaria de provar que a pessoa certa
// retirou. Eles recebem o aviso de pedido pago com instrução de pedir o código.
export function mensagemCodigoComprador(args: {
  idVenda: string;
  codigo: string;
  retirada: boolean;
  linkPedido: string;
}): string {
  return (
    `✅ Indústria 24h — pagamento confirmado!\n` +
    `Pedido ${args.idVenda}.\n` +
    `Seu código de ${args.retirada ? "retirada" : "entrega"}: *${args.codigo}*\n` +
    `Apresente-o ${args.retirada ? "na loja ao retirar" : "ao entregador"}.\n` +
    `Detalhes: ${args.linkPedido}`
  );
}

export function mensagemPedidoPagoSeller(args: {
  idVenda: string;
  valor: string;
  retirada: boolean;
}): string {
  return (
    `💰 Indústria 24h — pedido ${args.idVenda} PAGO (${args.valor}).\n` +
    (args.retirada
      ? `Retirada na loja: peça ao comprador o código de retirada de 4 dígitos e confirme no seu painel de Pedidos.`
      : `Entrega: o comprador apresentará um código de 4 dígitos na entrega; confirme no seu painel de Pedidos.`) +
    `\nPainel: https://industria24.com.br/seller/pedidos`
  );
}

export function mensagemRota(args: {
  origem: string;
  destino: string;
  ganho: string;
  distancia?: string;
  linkMapa: string;
}): string {
  return (
    `🚚 Indústria 24h — nova rota atribuída a você!\n` +
    `Origem: ${args.origem}\n` +
    `Destino: ${args.destino}\n` +
    (args.distancia ? `Percurso: ${args.distancia}\n` : "") +
    `Você ganha: ${args.ganho}\n` +
    `Trajeto: ${args.linkMapa}\n` +
    `Na entrega, peça ao destinatário o código de entrega de 4 dígitos.\n` +
    `Confirme e atualize o status no seu painel.`
  );
}
