import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { respostaErroGenerico } from "@/lib/api/erro-generico";
import { isServiceConfigured } from "@/lib/supabase/service";
import { tokenValido } from "@/lib/token-timing-safe";
import { confirmarPagamentoPedido, cancelarPedidoPorPagamento } from "@/lib/asaas-confirmar";

// Webhook do Asaas: confirma pagamento do pedido.
// Configurar no painel Asaas: URL /api/asaas/webhook + token de autenticação
// (env ASAAS_WEBHOOK_TOKEN — o Asaas envia no header asaas-access-token).
// Sempre respondemos 200 para eventos que não tratamos (evita fila travada).
//
// Este endpoint é só UM dos dois caminhos de confirmação — o outro é a
// verificação manual em asaas-verificar.ts (botão "Verificar pagamento" na
// página do pedido), usada quando o webhook não chega (painel sem webhook
// cadastrado no ambiente, ou entrega falhou/atrasou do lado da Asaas). Toda
// lógica de negócio de "o que significa pagamento confirmado" vive em
// asaas-confirmar.ts — este arquivo só valida a requisição e delega.

const clean = (v: string | undefined) => (v ?? "").replace(/^[﻿​]+/, "").trim();
const WEBHOOK_TOKEN = clean(process.env.ASAAS_WEBHOOK_TOKEN);

const EVENTOS_PAGO = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);
const EVENTOS_CANCELADO = new Set([
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_CANCELED",
  "PAYMENT_REFUNDED",
]);

export async function POST(request: NextRequest) {
  if (!tokenValido(request.headers.get("asaas-access-token"), WEBHOOK_TOKEN)) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!isServiceConfigured) {
    return NextResponse.json({ error: "service role ausente" }, { status: 500 });
  }

  const rawBody = request.clone();
  const body = (await request.json().catch(async (erro) => {
    const texto = await rawBody.text().catch(() => "");
    Sentry.captureMessage(erro instanceof Error ? erro.message : "Falha ao parsear webhook Asaas", {
      level: "warning",
      tags: { area: "checkout", gateway: "asaas", signal: "webhook_parse_failure" },
      extra: { rawBody: texto.slice(0, 500) },
    });
    return null;
  })) as {
    event?: string;
    payment?: {
      id?: string;
      externalReference?: string;
      status?: string;
      value?: number;
      paymentDate?: string;
    };
  } | null;

  const pedidoId = body?.payment?.externalReference;
  if (!body?.event || !pedidoId) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  if (EVENTOS_PAGO.has(body.event)) {
    const paymentId = body.payment?.id;
    const value = body.payment?.value;
    if (!paymentId || typeof value !== "number") {
      return NextResponse.json({ ok: true, ignorado: true });
    }
    try {
      const resultado = await confirmarPagamentoPedido(pedidoId, {
        id: paymentId,
        value,
        paymentDate: body.payment?.paymentDate ?? null,
      });
      if (!resultado.ok) {
        // cobrança/valor não conferem, ou pedido inexistente: webhook forjado
        // ou duplicado — não credita, mas confirma recebimento (200) para a
        // fila do Asaas não reenviar em loop.
        return NextResponse.json({ ok: true, ignorado: true, motivo: resultado.motivo });
      }
    } catch (erro) {
      return respostaErroGenerico(erro, 500, { tags: { area: "asaas-webhook" }, extra: { pedidoId } });
    }
  } else if (EVENTOS_CANCELADO.has(body.event)) {
    try {
      await cancelarPedidoPorPagamento(pedidoId);
    } catch (erro) {
      return respostaErroGenerico(erro, 500, { tags: { area: "asaas-webhook" }, extra: { pedidoId } });
    }
  }

  return NextResponse.json({ ok: true });
}
