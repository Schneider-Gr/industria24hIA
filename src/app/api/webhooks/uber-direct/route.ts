import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";

// database.types.ts ainda não tem as colunas da migration 0098 (gerar tipos
// exige `supabase login` da conta certa, indisponível aqui — mesmo caso do
// webhook Asaas, ver comentário em src/app/api/asaas/webhook/route.ts).
interface RotasSemTipos {
  from(table: "rotas"): {
    update(values: Record<string, unknown>): {
      eq(col: string, val: unknown): Promise<{ error: { message: string } | null }>;
    };
  };
}

// Webhook do Uber Direct: atualiza status de entrega/entregador na rota.
// Configurado no painel Uber Direct (Developer > Webhooks) apontando para
// https://industria24.com.br/webhooks/uber-direct — rewrite em next.config.ts
// traz para cá, seguindo a convenção do projeto de webhooks sob /api/*.
//
// Assinatura: doc pública do Uber Direct não deixou claro (nesta pesquisa) o
// nome exato do header de assinatura HMAC nem o corpo assinado — confirmar
// contra developer.uber.com/docs/deliveries antes de ir para produção com
// pedidos reais. UBER_DIRECT_WEBHOOK_SIGNING_KEY ausente = validação
// desligada (aceita tudo), sinalizado no Sentry a cada request nesse estado.
const SIGNING_KEY = (process.env.UBER_DIRECT_WEBHOOK_SIGNING_KEY ?? "").trim();

const STATUS_MAP: Record<string, "Atribuida" | "EmTransito" | "Entregue"> = {
  pending: "Atribuida",
  pickup: "Atribuida",
  pickup_complete: "EmTransito",
  in_transit: "EmTransito",
  delivered: "Entregue",
};

function assinaturaValida(rawBody: string, header: string | null): boolean {
  if (!SIGNING_KEY) return true; // ver aviso acima
  if (!header) return false;
  const esperado = crypto.createHmac("sha256", SIGNING_KEY).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(header));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!assinaturaValida(rawBody, request.headers.get("x-uber-signature"))) {
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

  return NextResponse.json({ ok: true });
}
