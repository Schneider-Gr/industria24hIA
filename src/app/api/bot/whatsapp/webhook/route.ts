import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { enviarWhatsapp, normalizeWhatsapp } from "@/lib/whatsapp";
import { chatComBot, isOpenAiConfigured } from "@/lib/ai/openai";
import { abrirChamadoJira } from "@/lib/ai/jira";
import { untyped, type ServiceClientSemTipos } from "@/lib/ai/botDb";
import type { ChatCompletionMessageParam, ChatCompletionToolMessageParam } from "openai/resources/chat/completions";

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

  await svc.from("bot_mensagens").insert({ conversa_id: conversa.id, remetente: "usuario", conteudo: msg.text.body });

  const { data: historico } = await svc
    .from("bot_mensagens")
    .select("remetente, conteudo")
    .eq("conversa_id", conversa.id)
    .order("created_at", { ascending: true })
    .limit(30);

  const mensagens: ChatCompletionMessageParam[] = (historico ?? []).map((m) => ({
    role: m.remetente === "usuario" ? "user" : "assistant",
    content: m.conteudo,
  }));

  let resposta = await chatComBot(mensagens);

  if (resposta.tool_calls?.length) {
    const toolResults: ChatCompletionToolMessageParam[] = [];
    for (const call of resposta.tool_calls) {
      if (call.type !== "function") continue;
      const args = JSON.parse(call.function.arguments || "{}") as Record<string, string>;
      let resultado: unknown;

      if (call.function.name === "buscar_pedido" && conversa.usuario_id) {
        // pedidos_cliente (view) filtra por auth.uid() na própria definição e
        // não expõe cliente_id como coluna — não dá para filtrar por fora.
        // Service role sem sessão de usuário, então consulta a tabela base
        // direto, replicando o mesmo conjunto de colunas não-financeiras
        // que a view exporia (0027).
        const { data } = await svcTyped
          .from("pedidos")
          .select("id_venda, status_pedido, valor_pedido, forma_pagamento")
          .eq("id_venda", args.pedido_id)
          .eq("cliente_id", conversa.usuario_id)
          .maybeSingle();
        resultado = data ?? { erro: "Pedido não encontrado." };
      } else if (call.function.name === "registrar_lead") {
        await svc.from("leads").insert({
          conversa_id: conversa.id,
          nome: args.nome ?? null,
          contato: args.contato ?? telefone,
          interesse: args.interesse ?? null,
        });
        resultado = { ok: true };
      } else if (call.function.name === "abrir_chamado") {
        const issueKey = await abrirChamadoJira({ conversaId: conversa.id, resumo: args.resumo });
        await svc.from("bot_conversas").update({ status: "escalada", jira_issue_key: issueKey }).eq("id", conversa.id);
        resultado = issueKey ? { ok: true, issue: issueKey } : { ok: false };
      } else {
        resultado = { erro: "não disponível sem identificação." };
      }

      toolResults.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(resultado) });
    }

    resposta = await chatComBot([
      ...mensagens,
      { role: "assistant", tool_calls: resposta.tool_calls, content: resposta.content },
      ...toolResults,
    ]);
  }

  const textoFinal = resposta.content ?? "Não consegui responder agora, tente novamente.";
  await svc.from("bot_mensagens").insert({ conversa_id: conversa.id, remetente: "bot", conteudo: textoFinal });
  await enviarWhatsapp(telefone, textoFinal);

  return NextResponse.json({ ok: true });
}
