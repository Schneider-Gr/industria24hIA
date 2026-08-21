import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import * as Sentry from "@sentry/nextjs";

// Webhook do BubbleWhats: recebe mensagem recebida / status de mensagem /
// status do aparelho. Aparelho é COMPARTILHADO com outra aplicação externa —
// esta rota só consome eventos, nunca chama endpoint de configuração do
// aparelho/webhook/plano no painel BubbleWhats.
//
// Autenticação: secret na query string (?secret=...), não header nem
// assinatura HMAC — conforme a API do BubbleWhats. Comparação timing-safe.
const WEBHOOK_SECRET = (process.env.BUBBLEWHATS_WEBHOOK_SECRET ?? "").trim();

function secretValido(recebido: string | null): boolean {
  if (!WEBHOOK_SECRET || !recebido) return false;
  const esperado = Buffer.from(WEBHOOK_SECRET);
  const dado = Buffer.from(recebido);
  if (esperado.length !== dado.length) return false;
  return crypto.timingSafeEqual(esperado, dado);
}

interface EventoBubblewhats {
  type?: "message" | "message_status" | "device_status" | string;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (!secretValido(secret)) {
    Sentry.captureMessage("Webhook BubbleWhats: secret inválido ou ausente", {
      level: "warning",
      tags: { area: "whatsapp", gateway: "bubblewhats" },
    });
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as EventoBubblewhats;

  switch (body.type) {
    case "message":
      console.log("[bubblewhats] mensagem recebida", body);
      break;
    case "message_status":
      console.log("[bubblewhats] status de mensagem", body);
      break;
    case "device_status":
      console.log("[bubblewhats] status do aparelho", body);
      Sentry.captureMessage("BubbleWhats: evento de status do aparelho", {
        level: "info",
        tags: { area: "whatsapp", gateway: "bubblewhats" },
        extra: { body },
      });
      break;
    default:
      console.log("[bubblewhats] evento não reconhecido", body);
  }

  return NextResponse.json({ ok: true });
}
