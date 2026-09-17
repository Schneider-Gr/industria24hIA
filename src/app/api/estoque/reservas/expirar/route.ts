import { NextResponse, type NextRequest } from "next/server";
import { respostaErroGenerico } from "@/lib/api/erro-generico";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { enviarEmail } from "@/lib/email";
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

  // Candidatos ANTES de expirar: depois da RPC não há como distinguir o pedido
  // que ela cancelou agora de qualquer outro cancelado. A confirmação vem
  // depois, comparando o status, e não por janela de tempo — duas rodadas do
  // cron na mesma hora avisariam a pessoa errada.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela da 0177 fora dos tipos gerados
  const { data: candidatos } = await (svc as any)
    .from("estoque_reservas")
    .select("pedido_id, pedidos!inner(status_pedido)")
    .eq("status", "ativa")
    .lte("expira_em", new Date().toISOString())
    .eq("pedidos.status_pedido", "Aguardando Pagamento");
  const idsCandidatos = [
    ...new Set(((candidatos ?? []) as { pedido_id: string }[]).map((r) => r.pedido_id)),
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC da 0177 fora dos tipos gerados
  const { data, error } = await (svc as any).rpc("estoque_reservas_expirar", {
    p_produto_id: null,
  });
  if (error) {
    await registrarEvento({ capability: "cron", origem: ORIGEM, resultado: "falha", motivo: error.message });
    return respostaErroGenerico(error, 500, { tags: { area: ORIGEM } });
  }

  const aviso = await avisarCompradores(svc, idsCandidatos);

  const resultado = { pedidos_expirados: (data as number) ?? 0, ...aviso };
  console.log("[estoque/reservas/expirar]", JSON.stringify(resultado));
  await registrarEvento({
    capability: "cron",
    origem: ORIGEM,
    resultado: aviso.erros.length > 0 ? "alerta" : "sucesso",
    motivo: aviso.erros.length > 0 ? aviso.erros.join("; ") : undefined,
    metadata: resultado,
  });
  return NextResponse.json(resultado);
}

// Quem compra e não paga descobre sozinho que o pedido caiu, porque o banco não
// tem trigger de notificação em `pedidos` e quem notifica é o app. O e-mail de
// status genérico existe, mas o texto dele manda falar com a loja, o que vira
// chamado justamente quando a causa é prazo vencido e a pessoa só precisa
// comprar de novo.
//
// Best-effort de ponta a ponta: o saldo já voltou e o pedido já foi cancelado
// pela RPC, então falha de e-mail vira alerta no evento, nunca erro do cron.
export async function avisarCompradores(
  svc: ReturnType<typeof createServiceClient>,
  idsCandidatos: string[],
): Promise<{ avisados: number; erros: string[] }> {
  const erros: string[] = [];
  if (idsCandidatos.length === 0) return { avisados: 0, erros };

  const { data: cancelados } = await svc
    .from("pedidos")
    .select("id, id_venda, cliente_id")
    .in("id", idsCandidatos)
    .eq("status_pedido", "Cancelado");

  let avisados = 0;
  for (const pedido of cancelados ?? []) {
    if (!pedido.cliente_id) continue;
    try {
      const { data: usuario } = await svc.auth.admin.getUserById(pedido.cliente_id);
      const email = usuario.user?.email;
      if (!email) continue;

      const { enviado, erro } = await enviarEmail({
        to: email,
        subject: `Seu pedido ${pedido.id_venda} foi cancelado por falta de pagamento`,
        text:
          `O prazo de pagamento do pedido ${pedido.id_venda} venceu e ele foi cancelado.\n\n` +
          `Os produtos voltaram para o estoque e ficaram disponíveis para outras pessoas. ` +
          `Se ainda quiser comprar, é só montar o carrinho de novo em ` +
          `https://industria24.com.br — o preço e a disponibilidade podem ter mudado.\n\n` +
          `Se você pagou e recebeu este aviso, responda para a gente conferir.`,
      });
      if (enviado) avisados++;
      else if (erro) erros.push(`pedido ${pedido.id_venda}: ${erro}`);
    } catch (e) {
      erros.push(`pedido ${pedido.id_venda}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { avisados, erros };
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
