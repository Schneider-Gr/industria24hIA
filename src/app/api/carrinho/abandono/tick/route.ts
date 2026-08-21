import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { enviarEmail, templateCarrinhoAbandonado } from "@/lib/email";
import { enviarBubblewhats, mensagemCarrinhoAbandonado } from "@/lib/bubblewhats";
import { normalizeWhatsapp } from "@/lib/whatsapp";
import { registrarEvento } from "@/lib/observabilidade/registrar-evento";

const ORIGEM = "carrinho/abandono/tick";

// Varredura de carrinho abandonado: 1h sem atualização e sem lembrete ainda
// enviado. Disparada pelo Vercel Cron (vercel.json, 1x/dia — o plano atual
// do projeto não permite cron horário, só diário; GET, autorizado pelo
// header que a própria Vercel injeta a partir de CRON_SECRET). POST continua
// disponível pra chamada manual/outro provedor, mesmo padrão de
// /api/coletivas/tick, reaproveitando o token do webhook Asaas.
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
  const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0094 fora dos tipos gerados
  const { data: carrinhos, error } = await (svc as any)
    .from("carrinhos_abandonados")
    .select("user_id, email, itens")
    .lt("atualizado_em", umaHoraAtras)
    .is("lembrete_enviado_em", null)
    .neq("itens", "[]");
  if (error) {
    await registrarEvento({ capability: "cron", origem: ORIGEM, resultado: "falha", motivo: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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
      html: templateCarrinhoAbandonado(itens),
    });
    if (!enviado) {
      if (erro) erros.push(erro);
      continue;
    }

    enviados++;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0094 fora dos tipos gerados
    await (svc as any)
      .from("carrinhos_abandonados")
      .update({ lembrete_enviado_em: new Date().toISOString() })
      .eq("user_id", carrinho.user_id);

    // Aviso por WhatsApp, best-effort — não há telefone em
    // carrinhos_abandonados, então reaproveita o mesmo fallback do webhook
    // Asaas: telefone do pedido mais recente do mesmo cliente.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pedidos fora de database.types.ts nesta consulta pontual
    const { data: pedidoRecente } = await (svc as any)
      .from("pedidos")
      .select("telefone_contato")
      .eq("cliente_id", carrinho.user_id)
      .not("telefone_contato", "is", null)
      .order("data", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pedidoRecente?.telefone_contato) {
      await enviarBubblewhats(
        normalizeWhatsapp(pedidoRecente.telefone_contato),
        mensagemCarrinhoAbandonado({ itens, linkCarrinho: "https://industria24.com.br/carrinho" })
      );
    }
  }

  const resultado = { varridos: carrinhos?.length ?? 0, enviados, erros };
  console.log("[carrinho/abandono/tick]", JSON.stringify(resultado));
  await registrarEvento({
    capability: "cron",
    origem: ORIGEM,
    resultado: erros.length > 0 ? "alerta" : "sucesso",
    motivo: erros.length > 0 ? erros.join("; ") : undefined,
    metadata: resultado,
  });
  return NextResponse.json(resultado);
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
