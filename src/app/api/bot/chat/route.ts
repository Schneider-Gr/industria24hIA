import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { chatComBot, isOpenAiConfigured } from "@/lib/ai/openai";
import { abrirChamadoJira } from "@/lib/ai/jira";
import { untyped } from "@/lib/ai/botDb";
import type { ChatCompletionMessageParam, ChatCompletionToolMessageParam } from "openai/resources/chat/completions";

export const runtime = "nodejs";

// Ferramenta buscar_pedido usa a sessão do próprio usuário (RLS via
// pedidos_cliente, migration 0027) — nunca o service role. Ele só vê o pedido
// que já é dele, igual a qualquer outra página do app.
async function buscarPedido(pedidoId: string) {
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

  await svc
    .from("bot_mensagens")
    .insert({ conversa_id: conversaIdConfirmado, remetente: "usuario", conteudo: body.mensagem });

  const { data: historico } = await svc
    .from("bot_mensagens")
    .select("remetente, conteudo")
    .eq("conversa_id", conversaIdConfirmado)
    .order("created_at", { ascending: true })
    .limit(30);

  const mensagens: ChatCompletionMessageParam[] = (historico ?? []).map((m) => ({
    role: m.remetente === "usuario" ? "user" : "assistant",
    content: m.conteudo,
  }));

  let resposta = await chatComBot(mensagens);

  // Loop simples de tool-calling: no máximo uma rodada de ferramentas por
  // turno — é atendimento, não agente autônomo de múltiplos passos.
  if (resposta.tool_calls?.length) {
    const toolResults: ChatCompletionToolMessageParam[] = [];
    for (const call of resposta.tool_calls) {
      if (call.type !== "function") continue;
      const args = JSON.parse(call.function.arguments || "{}") as Record<string, string>;
      let resultado: unknown;

      if (call.function.name === "buscar_pedido") {
        resultado = user ? await buscarPedido(args.pedido_id) : { erro: "Usuário não está logado." };
      } else if (call.function.name === "registrar_lead") {
        await svc.from("leads").insert({
          conversa_id: conversaIdConfirmado,
          nome: args.nome ?? null,
          contato: args.contato,
          interesse: args.interesse ?? null,
        });
        resultado = { ok: true };
      } else if (call.function.name === "abrir_chamado") {
        const issueKey = await abrirChamadoJira({ conversaId: conversaIdConfirmado, resumo: args.resumo });
        await svc
          .from("bot_conversas")
          .update({ status: "escalada", jira_issue_key: issueKey })
          .eq("id", conversaIdConfirmado);
        resultado = issueKey ? { ok: true, issue: issueKey } : { ok: false, aviso: "Escalonamento não configurado." };
      } else {
        resultado = { erro: "Ferramenta desconhecida." };
      }

      toolResults.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(resultado) });
    }

    resposta = await chatComBot([
      ...mensagens,
      { role: "assistant", tool_calls: resposta.tool_calls, content: resposta.content },
      ...toolResults,
    ]);
  }

  const textoFinal = resposta.content ?? "Não consegui gerar uma resposta agora.";
  await svc.from("bot_mensagens").insert({ conversa_id: conversaIdConfirmado, remetente: "bot", conteudo: textoFinal });

  return NextResponse.json({ conversaId: conversaIdConfirmado, resposta: textoFinal });
}
