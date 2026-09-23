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

// ============ Templates — venda futura (reserva) ============
// Dois marcos por item reservado: um aviso às vésperas, para o comprador se
// organizar e o seller separar a mercadoria, e outro no dia combinado.
// Comprador e seller recebem a mesma informação com a ação de cada lado.

export function mensagemVendaFuturaCompradorVespera(args: {
  idVenda: string;
  produto: string;
  quantidade: number;
  previsao: string;
  linkPedido: string;
}): string {
  return (
    `📅 Indústria 24h — sua reserva do pedido ${args.idVenda} está chegando.\n` +
    `${args.quantidade}x ${args.produto}, previsto para ${args.previsao}.\n` +
    `Acompanhe: ${args.linkPedido}`
  );
}

export function mensagemVendaFuturaCompradorNoDia(args: {
  idVenda: string;
  produto: string;
  quantidade: number;
  linkPedido: string;
}): string {
  return (
    `✅ Indústria 24h — hoje é o dia da sua reserva do pedido ${args.idVenda}.\n` +
    `${args.quantidade}x ${args.produto} disponível para retirada/entrega combinada.\n` +
    `Detalhes: ${args.linkPedido}`
  );
}

export function mensagemVendaFuturaSellerVespera(args: {
  idVenda: string;
  produto: string;
  quantidade: number;
  previsao: string;
  linkPedido: string;
}): string {
  return (
    `📦 Indústria 24h — reserva a entregar em ${args.previsao} (pedido ${args.idVenda}).\n` +
    `Separe ${args.quantidade}x ${args.produto}.\n` +
    `Pedido: ${args.linkPedido}`
  );
}

export function mensagemVendaFuturaSellerNoDia(args: {
  idVenda: string;
  produto: string;
  quantidade: number;
  linkPedido: string;
}): string {
  return (
    `⏰ Indústria 24h — hoje é a data combinada da reserva do pedido ${args.idVenda}.\n` +
    `${args.quantidade}x ${args.produto} precisa estar pronto para o comprador.\n` +
    `Pedido: ${args.linkPedido}`
  );
}

// PRD 047: a data vencia em silêncio. Cobrança direta, sem acusação — atraso de
// safra costuma ser renegociável, e o texto precisa abrir conversa, não disputa.
export function mensagemVendaFuturaSellerVencida(args: {
  idVenda: string;
  produto: string;
  quantidade: number;
  previsao: string;
  dias: number;
  linkPedido: string;
}): string {
  return (
    `⚠️ Indústria 24h — a reserva do pedido ${args.idVenda} passou da data combinada.\n` +
    `${args.quantidade}x ${args.produto} estava previsto para ${args.previsao} ` +
    `(${args.dias} ${args.dias === 1 ? "dia" : "dias"} de atraso).\n` +
    `Se precisar remarcar, fale com o comprador o quanto antes.\n` +
    `Pedido: ${args.linkPedido}`
  );
}

// Estoque crítico no ato da venda (PRD 047). Um aviso por pedido, com a lista:
// uma mensagem por produto viraria alarme contínuo e o seller silencia o canal.
export function mensagemEstoqueCriticoSeller(args: {
  idVenda: string;
  produtos: { nome: string; saldo: number }[];
  linkEstoque: string;
}): string {
  const linhas = args.produtos
    .map((p) => (p.saldo <= 0 ? `• ${p.nome}: esgotou` : `• ${p.nome}: restam ${p.saldo}`))
    .join("\n");
  const esgotou = args.produtos.some((p) => p.saldo <= 0);
  return (
    `📉 Indústria 24h — a venda ${args.idVenda} mexeu no seu estoque.\n` +
    `${linhas}\n` +
    (esgotou ? `Produto esgotado sai da vitrine até você repor.\n` : ``) +
    `Repor: ${args.linkEstoque}`
  );
}
