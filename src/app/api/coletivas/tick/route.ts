import { NextResponse, type NextRequest } from "next/server";
import { rodarEtapas } from "@/lib/agentes/coletiva-etapas";
import { isServiceConfigured } from "@/lib/supabase/service";
import { registrarEvento } from "@/lib/observabilidade/registrar-evento";

const ORIGEM = "coletivas/tick";

// Varredura das compras coletivas: fecha/expira o que venceu, emite os eventos
// de progresso e publica o recado do agente no mural (grafo LangGraph em
// lib/agentes/coletiva-etapas).
//
// ponytail: sem scheduler no projeto — quem dispara é externo (cron do
// provedor, chamada manual). A leitura das páginas também aciona o fechamento
// preguiçoso via RPC, então a ausência do tick atrasa o aviso, nunca o dinheiro.
// Protegida pelo mesmo token do webhook Asaas, que já é segredo de servidor.
export async function POST(req: NextRequest) {
  const token = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!token || req.headers.get("authorization") !== `Bearer ${token}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!isServiceConfigured) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada" },
      { status: 503 },
    );
  }

  try {
    const resultado = await rodarEtapas();
    await registrarEvento({
      capability: "cron",
      origem: ORIGEM,
      resultado: "sucesso",
      metadata: resultado as unknown as Record<string, unknown>,
    });
    return NextResponse.json(resultado);
  } catch (e) {
    const motivo = e instanceof Error ? e.message : "falha na varredura";
    await registrarEvento({ capability: "cron", origem: ORIGEM, resultado: "falha", motivo });
    return NextResponse.json({ error: motivo }, { status: 500 });
  }
}
