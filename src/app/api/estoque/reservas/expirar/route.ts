import { NextResponse, type NextRequest } from "next/server";
import { respostaErroGenerico } from "@/lib/api/erro-generico";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { registrarEvento } from "@/lib/observabilidade/registrar-evento";

const ORIGEM = "estoque/reservas/expirar";

// Varredura de reserva de estoque vencida (0177, Milestone 2 do PRD 036):
// devolve ao saldo o que pedido não pago segurou e cancela o pedido.
//
// Este cron é LIMPEZA, não a garantia dos 30 minutos. A garantia está dentro de
// checkout_criar_pedido, que expira a reserva do produto antes de decidir se há
// estoque — quem tenta comprar sempre vê o saldo correto, mesmo com este cron
// parado por dias. O que o cron resolve é a vitrine, que enquanto ele não roda
// mostra um número conservador (menos disponível do que existe), nunca otimista.
// Por isso o plano atual da Vercel, que só permite cron diário, é suficiente.
async function varrer(): Promise<Response> {
  if (!isServiceConfigured) {
    await registrarEvento({
      capability: "cron",
      origem: ORIGEM,
      resultado: "falha",
      motivo: "SUPABASE_SERVICE_ROLE_KEY não configurada",
    });
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada" },
      { status: 503 },
    );
  }

  const svc = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC da 0177 fora dos tipos gerados
  const { data, error } = await (svc as any).rpc("estoque_reservas_expirar", {
    p_produto_id: null,
  });
  if (error) {
    await registrarEvento({ capability: "cron", origem: ORIGEM, resultado: "falha", motivo: error.message });
    return respostaErroGenerico(error, 500, { tags: { area: ORIGEM } });
  }

  const resultado = { pedidos_expirados: (data as number) ?? 0 };
  console.log("[estoque/reservas/expirar]", JSON.stringify(resultado));
  await registrarEvento({
    capability: "cron",
    origem: ORIGEM,
    resultado: "sucesso",
    metadata: resultado,
  });
  return NextResponse.json(resultado);
}

// Vercel Cron: sempre GET, com `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  return varrer();
}

// Chamada manual ou por outro agendador, mesmo padrão das demais rotas de tick.
export async function POST(req: NextRequest) {
  const token = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!token || req.headers.get("authorization") !== `Bearer ${token}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  return varrer();
}
