import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { enviarEmail } from "@/lib/email";

// Varredura de carrinho abandonado: 1h sem atualização e sem lembrete ainda
// enviado. Disparada pelo Vercel Cron (vercel.json, 1x/dia — o plano atual
// do projeto não permite cron horário, só diário; GET, autorizado pelo
// header que a própria Vercel injeta a partir de CRON_SECRET). POST continua
// disponível pra chamada manual/outro provedor, mesmo padrão de
// /api/coletivas/tick, reaproveitando o token do webhook Asaas.
async function varrer(): Promise<Response> {
  if (!isServiceConfigured) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada" },
      { status: 503 },
    );
  }

  const svc = createServiceClient();
  const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: carrinhos, error } = await svc
    .from("carrinhos_abandonados")
    .select("user_id, email, itens")
    .lt("atualizado_em", umaHoraAtras)
    .is("lembrete_enviado_em", null)
    .neq("itens", "[]");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let enviados = 0;
  const erros: string[] = [];
  for (const carrinho of carrinhos ?? []) {
    if (!carrinho.email) continue;
    const itens = carrinho.itens as { nome: string; quantidade: number }[];
    const lista = itens.map((i) => `- ${i.quantidade}x ${i.nome}`).join("\n");

    const { enviado, erro } = await enviarEmail({
      to: carrinho.email,
      subject: "Você esqueceu itens no seu carrinho",
      text: `Seu carrinho na Indústria 24h está esperando por você:\n\n${lista}\n\nFinalize sua compra: https://industria24.com.br/carrinho`,
    });
    if (!enviado) {
      if (erro) erros.push(erro);
      continue;
    }

    enviados++;
    await svc
      .from("carrinhos_abandonados")
      .update({ lembrete_enviado_em: new Date().toISOString() })
      .eq("user_id", carrinho.user_id);
  }

  return NextResponse.json({ varridos: carrinhos?.length ?? 0, enviados, erros });
}

// Vercel Cron: sempre GET, injeta `Authorization: Bearer $CRON_SECRET`
// automaticamente quando a env var CRON_SECRET existe no projeto.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  return varrer();
}

export async function POST(req: NextRequest) {
  const token = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!token || req.headers.get("authorization") !== `Bearer ${token}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  return varrer();
}
