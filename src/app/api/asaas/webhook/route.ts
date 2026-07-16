import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { calcularTrajeto, linkTrajeto } from "@/lib/maps";
import { enviarWhatsapp, mensagemRota } from "@/lib/whatsapp";
import { processarRepassesPedido } from "@/lib/repasses";

type ServiceClient = ReturnType<typeof createServiceClient>;

// Tipos manuais para RPC/tabelas das migrations 0022/0043: ainda fora de
// database.types.ts (o projeto Supabase acessível via MCP/CLI local diverge
// do de produção — ver memória project-industria24h-rebuild; regenerar os
// tipos requer `supabase login` com a conta certa, não disponível aqui).
// `unknown` em vez de `any` mantém o TypeScript honesto no resto do arquivo.
type RpcResult<T> = { data: T | null; error: { message: string } | null };
type MaybeSingleResult<T> = { data: T | null };
interface ServiceClientSemTipos {
  rpc(fn: string, args: Record<string, unknown>): Promise<RpcResult<unknown>>;
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: unknown): {
        maybeSingle<T>(): Promise<MaybeSingleResult<T>>;
      };
    };
  };
}
type Corrida = {
  origem_endereco: string;
  destino_endereco: string;
  preco_final: number | null;
  afiliado_exclusivo_id: string | null;
};
type ParceiroLogistico = { telefone: string | null };

// Despacha corrida automática para o pedido pago (entrega), via
// despachar_corrida_automatica (migration 0043). Se houver afiliado
// logístico Aprovado da loja, ele ganha 5 min de exclusividade (avisado por
// WhatsApp); expirado ou sem afiliado, a corrida já nasce visível pro pool
// geral de parceiros de plataforma (RLS cuida disso, sem passo extra aqui).
// Substitui criarRotaParaPedido/rotas Pendente (fluxo manual da 0042) — o
// dono pediu para o checkout disparar automaticamente.
async function despacharCorridaParaPedido(svc: ServiceClient, pedidoId: string) {
  const untyped = svc as unknown as ServiceClientSemTipos;

  const { data: corridaId, error } = await untyped.rpc("despachar_corrida_automatica", {
    p_pedido_id: pedidoId,
  });
  if (error) throw new Error(`corrida não despachada: ${error.message}`);
  if (!corridaId) return; // retirada na loja: sem corrida

  const { data: corrida } = await untyped
    .from("corridas")
    .select("origem_endereco, destino_endereco, preco_final, afiliado_exclusivo_id")
    .eq("id", corridaId)
    .maybeSingle<Corrida>();
  if (!corrida?.afiliado_exclusivo_id) return;

  const { data: parceiro } = await untyped
    .from("parceiros_logisticos")
    .select("telefone")
    .eq("user_id", corrida.afiliado_exclusivo_id)
    .maybeSingle<ParceiroLogistico>();
  if (!parceiro?.telefone) return;

  const trajeto = await calcularTrajeto(corrida.origem_endereco, corrida.destino_endereco).catch(() => null);
  await enviarWhatsapp(
    parceiro.telefone,
    mensagemRota({
      origem: corrida.origem_endereco,
      destino: corrida.destino_endereco,
      comissao: corrida.preco_final ? `R$ ${Number(corrida.preco_final).toFixed(2)}` : "a combinar",
      linkMapa: trajeto?.link_mapa ?? linkTrajeto(corrida.origem_endereco, corrida.destino_endereco),
    })
  );
}

// Webhook do Asaas: confirma pagamento do pedido.
// Configurar no painel Asaas: URL /api/asaas/webhook + token de autenticação
// (env ASAAS_WEBHOOK_TOKEN — o Asaas envia no header asaas-access-token).
// Sempre respondemos 200 para eventos que não tratamos (evita fila travada).

const clean = (v: string | undefined) => (v ?? "").replace(/^[﻿​]+/, "").trim();
const WEBHOOK_TOKEN = clean(process.env.ASAAS_WEBHOOK_TOKEN);

const EVENTOS_PAGO = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);
const EVENTOS_CANCELADO = new Set([
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_CANCELED",
  "PAYMENT_REFUNDED",
]);

export async function POST(request: NextRequest) {
  if (!WEBHOOK_TOKEN || request.headers.get("asaas-access-token") !== WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!isServiceConfigured) {
    return NextResponse.json({ error: "service role ausente" }, { status: 500 });
  }

  const rawBody = request.clone();
  const body = (await request.json().catch(async (erro) => {
    const texto = await rawBody.text().catch(() => "");
    Sentry.captureMessage(erro instanceof Error ? erro.message : "Falha ao parsear webhook Asaas", {
      level: "warning",
      tags: { area: "checkout", gateway: "asaas", signal: "webhook_parse_failure" },
      extra: { rawBody: texto.slice(0, 500) },
    });
    return null;
  })) as {
    event?: string;
    payment?: {
      id?: string;
      externalReference?: string;
      status?: string;
      value?: number;
      paymentDate?: string;
    };
  } | null;

  const pedidoId = body?.payment?.externalReference;
  if (!body?.event || !pedidoId) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  if (EVENTOS_PAGO.has(body.event)) {
    const svc = createServiceClient();

    const { data: pedido } = await svc
      .from("pedidos")
      .select("asaas_cobranca_id, valor_pedido")
      .eq("id", pedidoId)
      .maybeSingle();

    const cobrancaConfere = pedido?.asaas_cobranca_id === body.payment?.id;
    const valorConfere =
      typeof body.payment?.value === "number" &&
      typeof pedido?.valor_pedido === "number" &&
      body.payment.value >= pedido.valor_pedido;
    if (!pedido || !cobrancaConfere || !valorConfere) {
      return NextResponse.json({ ok: true, ignorado: true });
    }

    const { error } = await svc
      .from("pedidos")
      .update({
        status_pedido: "Pagamento Realizado",
        dt_pagamento: body.payment?.paymentDate
          ? new Date(body.payment.paymentDate).toISOString()
          : new Date().toISOString(),
        // coluna é text (migration 0005); grava o valor recebido, não o status do evento
        valor_recebido_industria: String(body.payment?.value ?? pedido.valor_pedido),
      })
      .eq("id", pedidoId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await svc
      .from("linha_itens")
      .update({ pago: true, dt_pagamento_cliente: new Date().toISOString() })
      .eq("pedido_id", pedidoId);

    // Despacho automático (MPDD-22): pedido pago com entrega vira corrida no
    // feed de parceiros/afiliado logístico. Falha aqui não pode derrubar o
    // webhook (pagamento já confirmado) — loga no Sentry e segue.
    try {
      await despacharCorridaParaPedido(svc, pedidoId);
    } catch (erro) {
      Sentry.captureException(erro, {
        tags: { area: "logistica", signal: "roteirizacao_pos_pagamento" },
        extra: { pedidoId },
      });
    }

    // Repasse PIX automático (migration 0058, D-E4.4 tempo real): seller
    // recebe itens − 5% − afiliado + frete; afiliado recebe sua comissão.
    // Falha nunca derruba o webhook — fica em repasses.status p/ o admin.
    try {
      await processarRepassesPedido(svc, pedidoId);
    } catch (erro) {
      Sentry.captureException(erro, {
        tags: { area: "financeiro", signal: "repasse_pos_pagamento" },
        extra: { pedidoId },
      });
    }
  } else if (EVENTOS_CANCELADO.has(body.event)) {
    const svc = createServiceClient();
    const { error } = await (svc as unknown as ServiceClientSemTipos).rpc(
      "pedido_cancelar_devolver_estoque",
      { p_pedido_id: pedidoId },
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Estorno depois de repasse já transferido: reversão é MANUAL por desenho
    // (Processo 3 de e4-split-repasse-bpmn.md) — só alerta o financeiro.
    const { data: repassados } = await (svc as unknown as {
      from(t: string): {
        select(c: string): {
          eq(col: string, v: unknown): {
            eq(col: string, v: unknown): Promise<{ data: { id: string }[] | null }>;
          };
        };
      };
    })
      .from("repasses")
      .select("id")
      .eq("pedido_id", pedidoId)
      .eq("status", "transferido");
    if (repassados && repassados.length > 0) {
      Sentry.captureMessage("Estorno de pedido com repasse já transferido — reversão manual", {
        level: "warning",
        tags: { area: "financeiro", signal: "estorno_pos_repasse" },
        extra: { pedidoId, repasses: repassados.map((r) => r.id) },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
