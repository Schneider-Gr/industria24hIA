import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { isOpenAiConfigured } from "@/lib/ai/openai";
import { untyped } from "@/lib/ai/botDb";
import { processarMensagemBot, type ResultadoPedido } from "@/lib/ai/atendimento";
import { checarLimite } from "@/lib/rate-limit";

// Teto de mensagem: acima disso é abuso de custo de token, não conversa.
const MAX_MENSAGEM = 2000;

export const runtime = "nodejs";

// Ferramenta buscar_pedido usa a sessão do próprio usuário (RLS via
// pedidos_cliente, migration 0027) — nunca o service role. Ele só vê o pedido
// que já é dele, igual a qualquer outra página do app.
async function buscarPedido(pedidoId: string): Promise<ResultadoPedido> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pedidos_cliente")
    .select("id, id_venda, status_pedido, valor_pedido, forma_pagamento, codigo_retirada")
    .eq("id_venda", pedidoId)
    .maybeSingle();
  if (!data?.id) return { erro: "Pedido não encontrado para este usuário." };

  // Spec #311: itens com id — o bot precisa do linha_item_id pra montar o
  // link pré-preenchido de abertura de disputa (troca/devolução). Campo
  // renomeado pra "pedido_id_interno" (em vez de "id" genérico) porque o
  // modelo, em teste ao vivo, confundiu com id_venda e montou um link
  // quebrado — nome inequívoco resolve sem depender só de instrução de
  // prompt.
  const { id, ...resto } = data;
  const { data: itens } = await supabase.from("linha_itens_cliente").select("id, produto_nome").eq("pedido_id", id);
  return { ...resto, pedido_id_interno: id, itens: itens ?? [] };
}

// Spec #311 US01: histórico completo, pra não exigir que o comprador saiba
// o número do pedido de cor.
async function listarPedidos(): Promise<ResultadoPedido> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pedidos_cliente")
    .select("id_venda, data, status_pedido, valor_pedido, codigo_retirada")
    .order("data", { ascending: false })
    .limit(20);
  return { pedidos: data ?? [] };
}

// PRD 009 US05: RLS de `disputas` (comprador_id = auth.uid()) já restringe
// ao próprio usuário — o bot só monta rascunho/orienta, nunca cria a
// disputa; abertura formal continua exigindo confirmação em /pedido/[id].
async function buscarDisputas(): Promise<ResultadoPedido> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("disputas")
    .select("motivo, status, pedido_id")
    .order("aberta_em", { ascending: false })
    .limit(10);
  return { disputas: data ?? [] };
}

export async function POST(req: NextRequest) {
  if (!isOpenAiConfigured || !isServiceConfigured) {
    return NextResponse.json({ erro: "Bot indisponível no momento." }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { conversaId?: string; mensagem?: string } | null;
  const mensagem = body?.mensagem?.trim() ?? "";
  if (!mensagem) {
    return NextResponse.json({ erro: "Mensagem vazia." }, { status: 400 });
  }
  if (mensagem.length > MAX_MENSAGEM) {
    return NextResponse.json({ erro: "Mensagem muito longa." }, { status: 400 });
  }

  const svc = untyped(createServiceClient());
  const supabaseUser = await createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  // Loop de agente OpenAI: caro por chamada e aberto a anônimo (o bot pede
  // e-mail durante a conversa). Sem isto, um script gera custo de token e
  // linhas em bot_conversas sem limite. Chave por usuário logado, senão por IP.
  const chaveLimite = user?.id ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "sem-ip";
  if (!checarLimite(`bot-chat:${chaveLimite}`, 12, 60_000)) {
    return NextResponse.json({ erro: "Muitas mensagens seguidas. Aguarde um minuto." }, { status: 429 });
  }

  let conversaId = body?.conversaId ?? null;
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
    mensagemUsuario: mensagem,
    usuarioId: user?.id ?? null,
    buscarPedido,
    buscarDisputas,
    listarPedidos,
    contatoFallback: user?.email ?? undefined,
    usuarioContextoExtra: user?.email
      ? `Usuário logado — e-mail: ${user.email}. Se for coletar contato para lead/handoff, use este e-mail em vez de pedir de novo, só confirme.`
      : undefined,
  });

  return NextResponse.json({ conversaId: conversaIdConfirmado, resposta: textoFinal });
}
