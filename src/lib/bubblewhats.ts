// ============ Envio via BubbleWhats ============
// Integração separada da Meta Cloud API (ver whatsapp.ts): compartilha o
// MESMO aparelho já conectado e usado por outra aplicação externa. Este
// client SÓ chama send-message — nunca endpoint de configuração do
// aparelho/webhook/plano no painel BubbleWhats.
//
// Sem BUBBLEWHATS_TOKEN/BUBBLEWHATS_API_URL: isBubblewhatsConfigured=false e
// o envio vira no-op explícito (nunca finge que enviou).

const clean = (v: string | undefined) => (v ?? "").replace(/^﻿/, "").trim();

const TOKEN = clean(process.env.BUBBLEWHATS_TOKEN);
const API_URL = clean(process.env.BUBBLEWHATS_API_URL);

export const isBubblewhatsConfigured = TOKEN.length > 0 && API_URL.length > 0;

export type EnvioBubblewhatsResultado =
  | { ok: true }
  | {
      ok: false;
      motivo: "nao_configurado" | "token_invalido" | "numero_invalido_ou_timeout" | "parametro_invalido" | "aparelho_desconectado" | "erro_desconhecido";
      status?: number;
    };

export async function enviarBubblewhats(jid: string, mensagem: string): Promise<EnvioBubblewhatsResultado> {
  if (!isBubblewhatsConfigured) return { ok: false, motivo: "nao_configurado" };

  const res = await fetch(`${API_URL}/send-message`, {
    method: "POST",
    headers: {
      Authorization: TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jid, message: mensagem }),
  });

  if (res.ok) return { ok: true };

  switch (res.status) {
    case 401:
      return { ok: false, motivo: "token_invalido", status: 401 };
    case 408:
      return { ok: false, motivo: "numero_invalido_ou_timeout", status: 408 };
    case 422:
      return { ok: false, motivo: "parametro_invalido", status: 422 };
    case 502:
      return { ok: false, motivo: "aparelho_desconectado", status: 502 };
    default:
      return { ok: false, motivo: "erro_desconhecido", status: res.status };
  }
}

// ============ Templates — avisos de pedido ============
// Estilo alinhado aos templates existentes em whatsapp.ts (mensagemRota,
// mensagemPedidoPagoSeller): direto, emoji de contexto, link para o pedido.

export function mensagemSaiuParaEntrega(args: { idVenda: string; linkPedido: string }): string {
  return (
    `🚚 Indústria 24h — seu pedido ${args.idVenda} saiu para entrega!\n` +
    `Tenha em mãos o código de entrega para apresentar ao entregador.\n` +
    `Acompanhe: ${args.linkPedido}`
  );
}

export function mensagemDisputaAbertaLoja(args: { idVenda: string; motivo: string; linkDisputa: string }): string {
  return (
    `⚠️ Indústria 24h — disputa aberta no pedido ${args.idVenda}.\n` +
    `Motivo: ${args.motivo}\n` +
    `Responda em até 48h: ${args.linkDisputa}`
  );
}

export function mensagemPropostaResolucaoComprador(args: { idVenda: string; linkDisputa: string }): string {
  return (
    `📦 Indústria 24h — a loja propôs uma resolução para o pedido ${args.idVenda}.\n` +
    `Acesse e confirme ou recuse a proposta: ${args.linkDisputa}`
  );
}

export function mensagemDecisaoDisputa(args: {
  idVenda: string;
  decisao: string;
  destinatario: "comprador" | "loja";
  linkDisputa: string;
}): string {
  return (
    `⚖️ Indústria 24h — decisão da mediação no pedido ${args.idVenda}` +
    (args.destinatario === "loja" ? " (loja)" : "") +
    `.\n` +
    `Decisão: ${args.decisao}\n` +
    `Detalhes: ${args.linkDisputa}`
  );
}

export function mensagemCarrinhoAbandonado(args: { itens: { nome: string; quantidade: number }[]; linkCarrinho: string }): string {
  const lista = args.itens.map((i) => `- ${i.quantidade}x ${i.nome}`).join("\n");
  return (
    `🛒 Indústria 24h — você esqueceu itens no seu carrinho:\n` +
    `${lista}\n` +
    `Finalize sua compra: ${args.linkCarrinho}`
  );
}
