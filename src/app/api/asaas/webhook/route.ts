import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";

// Webhook do Asaas: confirma pagamento do pedido.
// Configurar no painel Asaas: URL /api/asaas/webhook + token de autenticação
// (env ASAAS_WEBHOOK_TOKEN — o Asaas envia no header asaas-access-token).
// Sempre respondemos 200 para eventos que não tratamos (evita fila travada).

const clean = (v: string | undefined) => (v ?? "").replace(/^[﻿​]+/, "").trim();
const WEBHOOK_TOKEN = clean(process.env.ASAAS_WEBHOOK_TOKEN);

const EVENTOS_PAGO = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);

export async function POST(request: NextRequest) {
  if (!WEBHOOK_TOKEN || request.headers.get("asaas-access-token") !== WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!isServiceConfigured) {
    return NextResponse.json({ error: "service role ausente" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as {
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
    const svc = createServiceClient();
    const { error } = await svc
      .from("pedidos")
      .update({
        status_pedido: "Pagamento Realizado",
        dt_pagamento: body.payment?.paymentDate
          ? new Date(body.payment.paymentDate).toISOString()
          : new Date().toISOString(),
        valor_recebido_industria: body.payment?.status ?? "RECEIVED",
      })
      .eq("id", pedidoId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await svc
      .from("linha_itens")
      .update({ pago: true, dt_pagamento_cliente: new Date().toISOString() })
      .eq("pedido_id", pedidoId);
  }

  return NextResponse.json({ ok: true });
}
