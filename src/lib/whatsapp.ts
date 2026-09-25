import { cortar } from "@/lib/ai/opcoesBot";

/** Normaliza número de WhatsApp cru (import Bubble, sem formato garantido) para dígitos com DDI 55. */
export function normalizeWhatsapp(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  // Pelo tamanho, não pelo prefixo: 55 também é DDD (RS). DDD + número = 10 ou 11.
  return digits.length <= 11 ? `55${digits}` : digits;
}

// WhatsApp obrigatório de seller e entregador (PRD 054, decisão 18): valida o
// que foi digitado e guarda só DDD + número; normalizeWhatsapp põe o 55 no envio.
/** "(92) 99123-4567" → "92991234567". null quando não é DDD + 8 ou 9 dígitos. */
export function validarWhatsapp(valor: string): string | null {
  let d = valor.replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? d : null;
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

// Payload interativo da Cloud API: até 3 opções viram botões (título até 20
// caracteres), de 4 a 10 viram lista (linha até 24). Corpo interativo aceita
// até 1024 caracteres; acima disso, ou sem opções, fica texto simples.
export function payloadInterativo(texto: string, opcoes: string[]): Record<string, unknown> | null {
  if (!opcoes.length || texto.length > 1024) return null;
  const body = { text: texto || "Escolha uma opção:" };
  if (opcoes.length <= 3) {
    return {
      type: "button",
      body,
      action: { buttons: opcoes.map((o, i) => ({ type: "reply", reply: { id: `op${i}`, title: cortar(o, 20) } })) },
    };
  }
  return {
    type: "list",
    body,
    action: {
      button: "Ver opções",
      sections: [{ title: "Opções", rows: opcoes.slice(0, 10).map((o, i) => ({ id: `op${i}`, title: o.slice(0, 24) })) }],
    },
  };
}

/** Resposta do bot: com opções, manda botões/lista; se a Meta recusar, cai no texto com as opções listadas. */
export async function enviarWhatsappComOpcoes(telefone: string, texto: string, opcoes: string[]): Promise<boolean> {
  const interactive = payloadInterativo(texto, opcoes);
  const numero = normalizeWhatsapp(telefone);
  if (interactive && isWhatsappConfigured && numero.length >= 12) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: numero, type: "interactive", interactive }),
    });
    if (res.ok) return true;
  }
  const lista = opcoes.length ? `\n\n${opcoes.map((o) => `• ${o}`).join("\n")}` : "";
  return enviarWhatsapp(telefone, texto + lista);
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
