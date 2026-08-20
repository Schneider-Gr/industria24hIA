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
