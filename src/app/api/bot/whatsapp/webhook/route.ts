import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { enviarWhatsapp, normalizeWhatsapp } from "@/lib/whatsapp";
import { isOpenAiConfigured } from "@/lib/ai/openai";
import { untyped, type ServiceClientSemTipos } from "@/lib/ai/botDb";
import { processarMensagemBot, type ResultadoPedido } from "@/lib/ai/atendimento";

export const runtime = "nodejs";

// Handshake de verificação do Meta (Configuração do Webhook no app):
// hub.verify_token é uma string própria nossa, não a App Secret — não precisa
// da credencial que ficou exposta no chat.
const VERIFY_TOKEN = (process.env.WHATSAPP_VERIFY_TOKEN ?? "").trim();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode === "subscribe" && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ erro: "verificação inválida" }, { status: 403 });
}

type WhatsappInboundPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{ from: string; text?: { body: string } }>;
      };
    }>;
  }>;
};

// Identidade: número de WhatsApp não é login. Enquanto a conversa não estiver
// identificada, o bot só responde dúvida geral (sem tool buscar_pedido) e pede
// o e-mail cadastrado; casada a conversa ao usuário, tools ficam liberadas.
async function identificarPorContato(svc: ServiceClientSemTipos, contato: string) {
  const { data } = await svc.rpc("resolver_usuario_por_contato", { p_contato: contato });
  return (data as string | null) ?? null;
}

export async function POST(req: NextRequest) {
  if (!isServiceConfigured || !isOpenAiConfigured) return NextResponse.json({ ok: true });

  const payload = (await req.json()) as WhatsappInboundPayload;
  const msg = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg?.text?.body) return NextResponse.json({ ok: true });

  const telefone = normalizeWhatsapp(msg.from);
  const svcTyped = createServiceClient();
  const svc = untyped(svcTyped);

  let { data: conversa } = await svc
    .from("bot_conversas")
    .select("id, usuario_id, identificado_em")
    .eq("telefone", telefone)
    .eq("status", "aberta")
    .maybeSingle();

  if (!conversa) {
    const { data: nova } = await svc
      .from("bot_conversas")
      .insert({ canal: "whatsapp", telefone })
      .select("id, usuario_id, identificado_em")
      .single();
    conversa = nova ?? null;
  }
  if (!conversa) return NextResponse.json({ ok: true });

  // Ainda não identificado: tenta casar o texto recebido (e-mail/CPF) com uma
  // conta antes de liberar consulta de dado sensível.
  if (!conversa.identificado_em) {
    const usuarioId = await identificarPorContato(svc, msg.text.body.trim());
    if (usuarioId) {
      await svc
        .from("bot_conversas")
        .update({ usuario_id: usuarioId, identificado_em: new Date().toISOString() })
        .eq("id", conversa.id);
      await enviarWhatsapp(telefone, "Identificado! Pode perguntar sobre seu pedido, afiliação ou o que precisar.");
      return NextResponse.json({ ok: true });
    }
  }

  // pedidos_cliente (view) filtra por auth.uid() na própria definição e não
  // expõe cliente_id como coluna — não dá para filtrar por fora. Service role
  // sem sessão de usuário, então consulta a tabela base direto, replicando o
  // mesmo conjunto de colunas não-financeiras que a view exporia (0027).
  const usuarioId = conversa.usuario_id;
  async function buscarPedido(pedidoId: string): Promise<ResultadoPedido> {
    if (!usuarioId) return { erro: "Usuário não identificado." };
    const { data } = await svcTyped
      .from("pedidos")
      .select("id_venda, status_pedido, valor_pedido, forma_pagamento")
      .eq("id_venda", pedidoId)
      .eq("cliente_id", usuarioId)
      .maybeSingle();
    return data ?? { erro: "Pedido não encontrado." };
  }

  const { textoFinal } = await processarMensagemBot({
    svc,
    conversaId: conversa.id,
    mensagemUsuario: msg.text.body,
    usuarioId,
    buscarPedido,
    contatoFallback: telefone,
    usuarioContextoExtra: `Conversa via WhatsApp — telefone: ${telefone}. Se for coletar contato para lead/handoff, use este telefone em vez de pedir de novo, só confirme.`,
  });

  await enviarWhatsapp(telefone, textoFinal);

  return NextResponse.json({ ok: true });
}
