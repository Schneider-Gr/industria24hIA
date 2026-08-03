import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { calcularTrajeto, linkTrajeto } from "@/lib/geo";
import {
  enviarWhatsapp,
  mensagemRota,
  mensagemCodigoComprador,
  mensagemPedidoPagoSeller,
} from "@/lib/whatsapp";
import { isUberDirectConfigured, cotarEntrega, criarEntrega } from "@/lib/uber-direct";

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
    update(values: Record<string, unknown>): {
      eq(col: string, val: unknown): Promise<{ error: { message: string } | null }>;
    };
  };
}
type Corrida = {
  origem_endereco: string;
  destino_endereco: string;
  preco_final: number | null;
  valor_parceiro: number | null;
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
    .select("origem_endereco, destino_endereco, preco_final, valor_parceiro, afiliado_exclusivo_id")
    .eq("id", corridaId)
    .maybeSingle<Corrida>();
  if (!corrida) return;

  // Percurso: grava distância/duração/link na corrida para o afiliado ver
  // (antes só ia pro WhatsApp, atrás do early return de telefone). Sem
  // GOOGLE_MAPS_API_KEY grava só o link_mapa — nunca um número plausível.
  const r = await calcularTrajeto(corrida.origem_endereco, corrida.destino_endereco);
  const trajeto = r.ok ? r.valor : null;
  const linkMapa = trajeto?.link_mapa ?? linkTrajeto(corrida.origem_endereco, corrida.destino_endereco);
  await untyped
    .from("corridas")
    .update({ distancia_m: trajeto?.distancia_m ?? null, duracao_s: trajeto?.duracao_s ?? null, link_mapa: linkMapa })
    .eq("id", corridaId);

  if (!corrida.afiliado_exclusivo_id) return;

  const { data: parceiro } = await untyped
    .from("parceiros_logisticos")
    .select("telefone")
    .eq("user_id", corrida.afiliado_exclusivo_id)
    .maybeSingle<ParceiroLogistico>();
  if (!parceiro?.telefone) return;

  await enviarWhatsapp(
    parceiro.telefone,
    mensagemRota({
      origem: corrida.origem_endereco,
      destino: corrida.destino_endereco,
      ganho: corrida.valor_parceiro ? `R$ ${Number(corrida.valor_parceiro).toFixed(2)}` : "a combinar",
      distancia: trajeto?.distancia_m ? `${(trajeto.distancia_m / 1000).toFixed(1)} km` : undefined,
      linkMapa,
    })
  );
}

interface RotasInsertSemTipos {
  from(table: "rotas"): {
    insert(values: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
  };
}

// Fallback Uber Direct (PRD 008, US01/US02): só roda quando o despacho
// automático interno (afiliado/parceiro logístico) não gerou corrida
// nenhuma para um pedido que precisa de entrega (retirar_na_loja=false em
// pelo menos um item). "Sem corrida" é o único sinal de indisponibilidade
// que o schema atual expõe — não há checagem prévia de cobertura de rota
// antes do despacho automático (ver levantamento no PRD).
async function despacharUberDirectSeElegivel(svc: ServiceClient, pedidoId: string) {
  if (!isUberDirectConfigured) return;

  const { data: rotaExistente } = await svc
    .from("rotas")
    .select("id")
    .eq("pedido_id", pedidoId)
    .maybeSingle();
  if (rotaExistente) return; // já despachado via afiliado/parceiro interno

  const { data: pedido } = await svc
    .from("pedidos")
    .select("id_venda, loja_id, telefone_contato")
    .eq("id", pedidoId)
    .maybeSingle();
  if (!pedido?.loja_id) return;

  const { data: itens } = await svc
    .from("linha_itens")
    .select(
      "retirar_na_loja, entrega_cep, entrega_rua, entrega_numero, entrega_bairro, entrega_cidade, entrega_complemento",
    )
    .eq("pedido_id", pedidoId);
  const itemEntrega = (itens ?? []).find(
    (i) => !i.retirar_na_loja && i.entrega_cep && i.entrega_rua && i.entrega_numero,
  );
  if (!itemEntrega) return; // só retirada, ou endereço do comprador incompleto

  const { data: loja } = await svc
    .from("lojas")
    .select("razao_social, whatsapp, cep, rua, numero, bairro, cidade, estado, complemento")
    .eq("id", pedido.loja_id)
    .maybeSingle();
  if (!loja?.cep || !loja.rua || !loja.numero || !loja.cidade || !loja.estado) {
    Sentry.captureMessage("Uber Direct: endereço da loja incompleto para pickup", {
      level: "warning",
      tags: { area: "logistica", gateway: "uber_direct" },
      extra: { pedidoId, lojaId: pedido.loja_id },
    });
    return;
  }

  const origem = {
    rua: loja.rua,
    numero: loja.numero,
    bairro: loja.bairro ?? undefined,
    cidade: loja.cidade,
    uf: loja.estado,
    cep: loja.cep,
    complemento: loja.complemento ?? undefined,
  };
  const destino = {
    rua: itemEntrega.entrega_rua!,
    numero: itemEntrega.entrega_numero!,
    bairro: itemEntrega.entrega_bairro ?? undefined,
    cidade: itemEntrega.entrega_cidade ?? loja.cidade,
    uf: loja.estado,
    cep: itemEntrega.entrega_cep!,
    complemento: itemEntrega.entrega_complemento ?? undefined,
  };

  const cotacao = await cotarEntrega({ origem, destino });
  const entrega = await criarEntrega({
    quoteId: cotacao.id,
    origem,
    origemNomeContato: loja.razao_social ?? "Vendedor Indústria24h",
    origemTelefone: loja.whatsapp ?? "",
    destino,
    destinoNomeContato: "Comprador Indústria24h",
    destinoTelefone: pedido.telefone_contato ?? "",
    manifestoDescricao: `Pedido ${pedido.id_venda}`,
    pedidoId,
  });

  const { error } = await (svc as unknown as RotasInsertSemTipos).from("rotas").insert({
    pedido_id: pedidoId,
    origem_cep: loja.cep,
    destino_cep: itemEntrega.entrega_cep,
    frete_calculado: cotacao.feeCentavos / 100,
    status: "Atribuida",
    uber_delivery_id: entrega.id,
    uber_tracking_url: entrega.trackingUrl,
    uber_status: entrega.status,
  });
  if (error) throw new Error(`rota Uber Direct não gravada: ${error.message}`);
}

// Avisos de pagamento por WhatsApp (0073). Comprador recebe o CÓDIGO de
// retirada/entrega; seller recebe só o aviso de pedido pago (o código com
// ele anularia a prova de que a pessoa certa retirou). Pedidos de compra
// coletiva não têm telefone próprio — cai no último telefone_contato do
// mesmo cliente, se houver.
async function notificarPagamento(svc: ServiceClient, pedidoId: string) {
  const { data: pedido } = await svc
    .from("pedidos")
    .select("id_venda, valor_pedido, codigo_retirada, telefone_contato, cliente_id, loja_id")
    .eq("id", pedidoId)
    .maybeSingle();
  if (!pedido) return;

  const { data: itens } = await svc
    .from("linha_itens")
    .select("retirar_na_loja")
    .eq("pedido_id", pedidoId);
  const retirada = (itens ?? []).every((i) => i.retirar_na_loja);

  // Comprador: telefone do pedido, ou o último informado pelo mesmo cliente.
  let telComprador = pedido.telefone_contato;
  if (!telComprador && pedido.cliente_id) {
    const { data: anterior } = await svc
      .from("pedidos")
      .select("telefone_contato")
      .eq("cliente_id", pedido.cliente_id)
      .not("telefone_contato", "is", null)
      .order("data", { ascending: false })
      .limit(1)
      .maybeSingle();
    telComprador = anterior?.telefone_contato ?? null;
  }
  if (telComprador && pedido.codigo_retirada) {
    await enviarWhatsapp(
      telComprador,
      mensagemCodigoComprador({
        idVenda: pedido.id_venda,
        codigo: pedido.codigo_retirada,
        retirada,
        linkPedido: `https://industria24.com.br/pedido/${pedidoId}`,
      }),
    );
  }

  // Seller: aviso de pedido pago no WhatsApp da loja.
  if (pedido.loja_id) {
    const { data: loja } = await svc
      .from("lojas")
      .select("whatsapp")
      .eq("id", pedido.loja_id)
      .maybeSingle();
    if (loja?.whatsapp) {
      await enviarWhatsapp(
        loja.whatsapp,
        mensagemPedidoPagoSeller({
          idVenda: pedido.id_venda,
          valor: `R$ ${Number(pedido.valor_pedido).toFixed(2)}`,
          retirada,
        }),
      );
    }
  }
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

    // Avisos por WhatsApp (0073): código de retirada ao comprador; aviso de
    // pedido pago ao seller. Best-effort: falha não derruba o webhook.
    try {
      await notificarPagamento(svc, pedidoId);
    } catch (erro) {
      Sentry.captureException(erro, {
        tags: { area: "whatsapp", signal: "notificacao_pagamento" },
        extra: { pedidoId },
      });
    }

    // Despacho automático (MPDD-22): pedido pago com entrega vira corrida no
    // feed de parceiros/afiliado logístico. Falha aqui não pode derrubar o
    // webhook (pagamento já confirmado) — loga no Sentry e segue.
    try {
      await despacharCorridaParaPedido(svc, pedidoId);
      await despacharUberDirectSeElegivel(svc, pedidoId);
    } catch (erro) {
      Sentry.captureException(erro, {
        tags: { area: "logistica", signal: "roteirizacao_pos_pagamento" },
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
  }

  return NextResponse.json({ ok: true });
}
