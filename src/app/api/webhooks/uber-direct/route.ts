import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { avisarSaiuParaEntrega } from "@/lib/avisos-pedido";
import { assinaturaUberDirectValida } from "@/lib/uber-direct-webhook-signature";

// database.types.ts ainda não tem as colunas da migration 0103 (gerar tipos
// exige `supabase login` da conta certa, indisponível aqui — mesmo caso do
// webhook Asaas, ver comentário em src/app/api/asaas/webhook/route.ts).
interface RotasSemTipos {
  from(table: "rotas"): {
    update(values: Record<string, unknown>): {
      eq(col: string, val: unknown): Promise<{ error: { message: string } | null }>;
    };
    select(cols: string): {
      eq(col: string, val: unknown): {
        maybeSingle(): Promise<{ data: { pedido_id: string } | null }>;
      };
    };
  };
}

// Webhook do Uber Direct: atualiza status de entrega/entregador na rota.
// Configurado no painel Uber Direct (Developer > Webhooks) apontando para
// https://industria24.com.br/webhooks/uber-direct — rewrite em next.config.ts
// traz para cá, seguindo a convenção do projeto de webhooks sob /api/*.
//
// Assinatura — CONFIRMADO contra a doc oficial (developer.uber.com/docs/
// deliveries/guides/webhooks, 2026-08-21): header `x-uber-signature` e
// algoritmo HMAC-SHA256 estão corretos. O que estava ERRADO era o valor da
// env: a Uber gera uma "Webhook Signing Key" DEDICADA por endpoint de
// webhook, obtida no painel (Webhooks → entrada do endpoint → menu "⋮" →
// Editar) — NÃO é o mesmo valor de UBER_DIRECT_CLIENT_SECRET, que é o que
// foi gravado em 2026-08-03 por falta da informação correta no momento.
// ⚠️ PENDENTE (ação humana, painel Uber Direct): abrir a entrada do webhook
// de sandbox, copiar a Signing Key real exibida lá, e regravar
// UBER_DIRECT_WEBHOOK_SIGNING_KEY no Vercel (Production + Preview) com esse
// valor. Até isso ser feito, este endpoint rejeita TODO request (fail-closed,
// achado OWASP #2) — atualização de status de entrega para de funcionar, mas
// não há mais como forjar entrega sem a signing key real.
const SIGNING_KEY = (process.env.UBER_DIRECT_WEBHOOK_SIGNING_KEY ?? "").trim();

const STATUS_MAP: Record<string, "Atribuida" | "EmTransito" | "Entregue"> = {
  pending: "Atribuida",
  pickup: "Atribuida",
  pickup_complete: "EmTransito",
  in_transit: "EmTransito",
  delivered: "Entregue",
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!assinaturaUberDirectValida(rawBody, request.headers.get("x-uber-signature"), SIGNING_KEY)) {
    Sentry.captureMessage("Webhook Uber Direct: assinatura inválida", {
      level: "warning",
      tags: { area: "logistica", gateway: "uber_direct" },
    });
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!isServiceConfigured) {
    return NextResponse.json({ error: "service role ausente" }, { status: 500 });
  }

  const body = JSON.parse(rawBody || "{}") as {
    kind?: string;
    data?: { delivery_id?: string; status?: string; tracking_url?: string };
  };

  const deliveryId = body.data?.delivery_id;
  const statusUber = body.data?.status;
  if (!deliveryId || !statusUber) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const statusInterno = STATUS_MAP[statusUber];
  const svc = createServiceClient() as unknown as RotasSemTipos;
  const update: Record<string, unknown> = { uber_status: statusUber };
  if (statusInterno) update.status = statusInterno;
  if (body.data?.tracking_url) update.uber_tracking_url = body.data.tracking_url;

  const { error } = await svc.from("rotas").update(update).eq("uber_delivery_id", deliveryId);
  if (error) {
    Sentry.captureException(new Error(error.message), {
      tags: { area: "logistica", gateway: "uber_direct", signal: "webhook_update" },
      extra: { deliveryId },
    });
  }

  // Aviso "saiu para entrega" ao comprador — best-effort, nunca bloqueia a
  // atualização de status já persistida acima.
  if (statusInterno === "EmTransito") {
    const { data: rota } = await svc
      .from("rotas")
      .select("pedido_id")
      .eq("uber_delivery_id", deliveryId)
      .maybeSingle();
    if (rota?.pedido_id) {
      await avisarSaiuParaEntrega(rota.pedido_id);
    }
  }

  return NextResponse.json({ ok: true });
}
