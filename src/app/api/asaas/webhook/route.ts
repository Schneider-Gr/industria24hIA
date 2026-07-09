import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";

// Webhook do Asaas: confirma pagamento do pedido.
// Configurar no painel Asaas: URL /api/asaas/webhook + token de autenticação
// (env ASAAS_WEBHOOK_TOKEN — o Asaas envia no header asaas-access-token).
// Sempre respondemos 200 para eventos que não tratamos (evita fila travada).

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

    const { data: pedido } = await svc
      .from("pedidos")
      .select("asaas_cobranca_id, valor_pedido")
      .eq("id", pedidoId)
      .maybeSingle();

    const cobrancaConfere = pedido?.asaas_cobranca_id === body.payment?.id;
    const valorConfere =
      typeof body.payment?.value === "number" &&
      typeof pedido?.valor_pedido === "number" &&
      body.payment.value >= pedido.valor_pedido;
    if (!pedido || !cobrancaConfere || !valorConfere) {
      return NextResponse.json({ ok: true, ignorado: true });
    }

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
  } else if (EVENTOS_CANCELADO.has(body.event)) {
    const svc = createServiceClient();
    // any: função nova (migration 0022) ainda não aplicada ao banco/tipos gerados
    const { error } = await (svc.rpc as any)("pedido_cancelar_devolver_estoque", {
      p_pedido_id: pedidoId,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
