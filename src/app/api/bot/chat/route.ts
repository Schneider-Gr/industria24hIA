import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { isOpenAiConfigured } from "@/lib/ai/openai";
import { untyped } from "@/lib/ai/botDb";
import { processarMensagemBot, type ResultadoPedido } from "@/lib/ai/atendimento";

export const runtime = "nodejs";

// Ferramenta buscar_pedido usa a sessão do próprio usuário (RLS via
// pedidos_cliente, migration 0027) — nunca o service role. Ele só vê o pedido
// que já é dele, igual a qualquer outra página do app.
async function buscarPedido(pedidoId: string): Promise<ResultadoPedido> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pedidos_cliente")
    .select("id_venda, status_pedido, valor_pedido, forma_pagamento")
    .eq("id_venda", pedidoId)
    .maybeSingle();
  return data ?? { erro: "Pedido não encontrado para este usuário." };
}

export async function POST(req: NextRequest) {
  if (!isOpenAiConfigured || !isServiceConfigured) {
    return NextResponse.json({ erro: "Bot indisponível no momento." }, { status: 503 });
  }

  const body = (await req.json()) as { conversaId?: string; mensagem: string };
  if (!body.mensagem?.trim()) {
    return NextResponse.json({ erro: "Mensagem vazia." }, { status: 400 });
  }

  const svc = untyped(createServiceClient());
  const supabaseUser = await createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  let conversaId = body.conversaId ?? null;
  if (!conversaId) {
    const { data: conversa, error } = await svc
      .from("bot_conversas")
      .insert({ canal: "site", usuario_id: user?.id ?? null })
      .select("id")
      .single();
    if (error || !conversa) return NextResponse.json({ erro: "Falha ao iniciar conversa." }, { status: 500 });
    conversaId = conversa.id;
  }
  const conversaIdConfirmado: string = conversaId;

  const { textoFinal } = await processarMensagemBot({
    svc,
    conversaId: conversaIdConfirmado,
    mensagemUsuario: body.mensagem,
    usuarioId: user?.id ?? null,
    buscarPedido,
    contatoFallback: user?.email ?? undefined,
    usuarioContextoExtra: user?.email
      ? `Usuário logado — e-mail: ${user.email}. Se for coletar contato para lead/handoff, use este e-mail em vez de pedir de novo, só confirme.`
      : undefined,
  });

  return NextResponse.json({ conversaId: conversaIdConfirmado, resposta: textoFinal });
}
