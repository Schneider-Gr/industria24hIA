import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { calcularTrajeto, linkTrajeto } from "@/lib/maps";

type ServiceClient = ReturnType<typeof createServiceClient>;

// Cria a rota do pedido pago (entrega), SEM atribuir parceiro/afiliado —
// decisão do dono (PRD 04, 2026-07-13): a atribuição deixou de ser
// automática, o seller escolhe manualmente em /seller/rotas (RPC
// atribuir_rota, migration 0042), que também dispara o WhatsApp.
async function criarRotaParaPedido(svc: ServiceClient, pedidoId: string) {
  const { data: pedido } = await svc
    .from("pedidos")
    .select("id, loja_id")
    .eq("id", pedidoId)
    .maybeSingle();
  if (!pedido) return;

  const { data: itens } = await svc
    .from("linha_itens")
    .select("retirar_na_loja, entrega_cep, entrega_rua, entrega_numero, entrega_cidade, valor_frete")
    .eq("pedido_id", pedidoId);
  const entrega = (itens ?? []).find((i) => i.retirar_na_loja === false && i.entrega_cep);
  if (!entrega) return; // retirada na loja: sem rota

  const { data: loja } = await svc
    .from("lojas")
    .select("cep, rua, numero, cidade, estado")
    .eq("id", pedido.loja_id)
    .maybeSingle();

  const origem = [loja?.rua, loja?.numero, loja?.cidade, loja?.estado, loja?.cep]
    .filter(Boolean)
    .join(", ");
  const destino = [entrega.entrega_rua, entrega.entrega_numero, entrega.entrega_cidade, entrega.entrega_cep]
    .filter(Boolean)
    .join(", ");

  const trajeto = await calcularTrajeto(origem, destino).catch(() => null);
  const freteTotal = (itens ?? []).reduce((s, i) => s + Number(i.valor_frete ?? 0), 0);

  // any: tabela nova (migration 0039) ainda fora dos tipos gerados
  const { error } = await (svc.from as any)("rotas").insert({
    pedido_id: pedidoId,
    origem_cep: loja?.cep ?? null,
    destino_cep: entrega.entrega_cep,
    distancia_m: trajeto?.distancia_m ?? null,
    duracao_s: trajeto?.duracao_s ?? null,
    link_mapa: trajeto?.link_mapa ?? linkTrajeto(origem, destino),
    frete_calculado: freteTotal || null,
    status: "Pendente",
  });
  if (error) throw new Error(`rota não criada: ${error.message}`);
}

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
        // coluna é text (migration 0005); grava o valor recebido, não o status do evento
        valor_recebido_industria: String(body.payment?.value ?? pedido.valor_pedido),
      })
      .eq("id", pedidoId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await svc
      .from("linha_itens")
      .update({ pago: true, dt_pagamento_cliente: new Date().toISOString() })
      .eq("pedido_id", pedidoId);

    // Roteirização (MPDD-22): pedido pago com entrega ganha rota atribuída a um
    // afiliado logístico + aviso WhatsApp. Falha aqui não pode derrubar o
    // webhook (pagamento já confirmado) — loga no Sentry e segue.
    try {
      await criarRotaParaPedido(svc, pedidoId);
    } catch (erro) {
      Sentry.captureException(erro, {
        tags: { area: "logistica", signal: "roteirizacao_pos_pagamento" },
        extra: { pedidoId },
      });
    }
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
