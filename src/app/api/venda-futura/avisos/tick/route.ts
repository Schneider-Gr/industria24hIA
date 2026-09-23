import { NextResponse, type NextRequest } from "next/server";
import { respostaErroGenerico } from "@/lib/api/erro-generico";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { registrarEvento } from "@/lib/observabilidade/registrar-evento";
import { normalizeWhatsapp } from "@/lib/whatsapp";
import {
  enviarBubblewhats,
  mensagemVendaFuturaCompradorNoDia,
  mensagemVendaFuturaCompradorVespera,
  mensagemVendaFuturaSellerNoDia,
  mensagemVendaFuturaSellerVespera,
  mensagemVendaFuturaSellerVencida,
} from "@/lib/bubblewhats";
import { enviarEmail } from "@/lib/email";
import {
  formatarDataBR,
  hojeManaus,
  marcoDoDia,
  diasDeAtraso,
  type MarcoVendaFutura,
} from "@/lib/venda-futura/avisos";

const ORIGEM = "venda-futura/avisos/tick";
const SITE = "https://industria24.com.br";

// Avisos de reserva por WhatsApp: às vésperas e no dia combinado, para o
// comprador e para o seller. Até aqui a venda futura era vendida e sumia do
// radar — o comprador só sabia a data no e-mail do pedido e o seller não era
// lembrado de separar a mercadoria.
//
// Cron diário (vercel.json). Idempotente pela tabela `alertas_enviados`
// (0174): mesmo item + mesmo marco só dispara uma vez.
async function varrer(): Promise<Response> {
  if (!isServiceConfigured) {
    await registrarEvento({
      capability: "cron",
      origem: ORIGEM,
      resultado: "falha",
      motivo: "SUPABASE_SERVICE_ROLE_KEY não configurada",
    });
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada" }, { status: 503 });
  }

  const svc = createServiceClient();
  const hoje = hojeManaus();

  // Itens de pedido que são reserva. A data vem da própria oferta.
  const { data: itens, error } = await svc
    .from("linha_itens")
    .select("id, pedido_id, produto_nome, quantidade, venda_futura_id, entregue")
    .not("venda_futura_id", "is", null);
  if (error) {
    await registrarEvento({ capability: "cron", origem: ORIGEM, resultado: "falha", motivo: error.message });
    return respostaErroGenerico(error, 500, { tags: { area: ORIGEM } });
  }

  const pendentes = (itens ?? []).filter((i) => !i.entregue);
  if (pendentes.length === 0) {
    const vazio = { candidatos: 0, avisos: 0, erros: [] as string[] };
    await registrarEvento({ capability: "cron", origem: ORIGEM, resultado: "sucesso", metadata: vazio });
    return NextResponse.json(vazio);
  }

  const { data: ofertas } = await svc
    .from("vendas_futuras")
    .select("id, previsao")
    .in("id", pendentes.map((i) => i.venda_futura_id as string));
  const previsaoPorOferta = new Map((ofertas ?? []).map((o) => [o.id, o.previsao]));

  // Só o que cai num dos marcos de hoje (véspera, o dia, ou vencido ontem).
  const doDia = pendentes
    .map((i) => ({ item: i, marco: marcoDoDia(previsaoPorOferta.get(i.venda_futura_id as string) ?? null, hoje) }))
    .filter((c): c is { item: (typeof pendentes)[number]; marco: MarcoVendaFutura } => c.marco !== null);

  if (doDia.length === 0) {
    const vazio = { candidatos: 0, avisos: 0, erros: [] as string[] };
    await registrarEvento({ capability: "cron", origem: ORIGEM, resultado: "sucesso", metadata: vazio });
    return NextResponse.json(vazio);
  }

  const { data: pedidos } = await svc
    .from("pedidos")
    .select("id, id_venda, loja_id, telefone_contato")
    .in("id", doDia.map((c) => c.item.pedido_id));
  const pedidoPorId = new Map((pedidos ?? []).map((p) => [p.id, p]));

  const { data: lojas } = await svc
    .from("lojas")
    .select("id, whatsapp")
    .in("id", [...new Set((pedidos ?? []).map((p) => p.loja_id))]);
  const lojaPorId = new Map((lojas ?? []).map((l) => [l.id, l]));

  const chave = (itemId: string, marco: string) => `venda_futura:${itemId}:${marco}`;
  const { data: jaAvisados } = await svc
    .from("alertas_enviados")
    .select("chave")
    .in("chave", doDia.map((c) => chave(c.item.id, c.marco)));
  const suprimidos = new Set((jaAvisados ?? []).map((a) => a.chave));

  let avisos = 0;
  const erros: string[] = [];
  // Vencidos do dia num e-mail só para o admin: é risco de disputa e de
  // dinheiro parado, e quem vai cobrar precisa da lista inteira de uma vez.
  const vencidosParaAdmin: string[] = [];
  for (const { item, marco } of doDia) {
    if (suprimidos.has(chave(item.id, marco))) continue;

    const pedido = pedidoPorId.get(item.pedido_id);
    if (!pedido) continue;

    const previsao = formatarDataBR(previsaoPorOferta.get(item.venda_futura_id as string) as string);
    const base = {
      idVenda: pedido.id_venda ?? pedido.id,
      produto: item.produto_nome ?? "seu produto",
      quantidade: item.quantidade ?? 1,
      previsao,
      linkPedido: `${SITE}/pedido/${pedido.id}`,
    };

    const numeroSeller = lojaPorId.get(pedido.loja_id)?.whatsapp
      ? normalizeWhatsapp(lojaPorId.get(pedido.loja_id)!.whatsapp as string)
      : null;

    // Vencido (PRD 047): cobra o seller e avisa o admin, mas NÃO o comprador.
    // Avisar o comprador antes de alguém poder responder abre disputa que a
    // renegociação com o seller costuma resolver — atraso de safra é comum.
    const destinos: { numero: string | null; mensagem: string }[] =
      marco === "vencido"
        ? [
            {
              numero: numeroSeller,
              mensagem: mensagemVendaFuturaSellerVencida({
                ...base,
                dias: diasDeAtraso(previsaoPorOferta.get(item.venda_futura_id as string) as string, hoje),
              }),
            },
          ]
        : [
            {
              numero: pedido.telefone_contato ? normalizeWhatsapp(pedido.telefone_contato) : null,
              mensagem:
                marco === "vespera"
                  ? mensagemVendaFuturaCompradorVespera(base)
                  : mensagemVendaFuturaCompradorNoDia(base),
            },
            {
              numero: numeroSeller,
              mensagem:
                marco === "vespera"
                  ? mensagemVendaFuturaSellerVespera(base)
                  : mensagemVendaFuturaSellerNoDia(base),
            },
          ];

    if (marco === "vencido") {
      vencidosParaAdmin.push(
        `${base.idVenda}: ${base.quantidade}x ${base.produto}, previsto para ${base.previsao}`,
      );
    }

    let algumEnviado = false;
    for (const destino of destinos) {
      if (!destino.numero) continue;
      const envio = await enviarBubblewhats(destino.numero, destino.mensagem);
      if (envio.ok) {
        algumEnviado = true;
        avisos++;
      } else {
        erros.push(`${item.id}/${marco}: ${envio.motivo}`);
      }
    }

    // Só marca quando alguém realmente recebeu: falha de envio precisa poder
    // tentar de novo amanhã (e o aviso de véspera ainda é útil no dia).
    if (algumEnviado) {
      await svc
        .from("alertas_enviados")
        .upsert({ chave: chave(item.id, marco), enviado_em: new Date().toISOString() }, { onConflict: "chave" });
    }
  }

  // O seller é cobrado por WhatsApp; o admin recebe a lista por e-mail para
  // decidir caso a caso. Sem EMAIL_ADMIN_NOVA_LOJA configurado, vira no-op.
  const emailAdmin = process.env.EMAIL_ADMIN_NOVA_LOJA;
  if (vencidosParaAdmin.length > 0 && emailAdmin) {
    await enviarEmail({
      to: emailAdmin,
      subject: `Venda futura vencida: ${vencidosParaAdmin.length} ${vencidosParaAdmin.length === 1 ? "item" : "itens"}`,
      text:
        `Itens de venda futura que passaram da data combinada e não foram entregues:\n\n` +
        vencidosParaAdmin.map((l) => `- ${l}`).join("\n") +
        `\n\nO seller foi avisado por WhatsApp. O comprador não foi avisado.`,
    });
  }

  const resultado = { candidatos: doDia.length, avisos, vencidos: vencidosParaAdmin.length, erros };
  await registrarEvento({
    capability: "cron",
    origem: ORIGEM,
    resultado: erros.length > 0 ? "alerta" : "sucesso",
    motivo: erros.length > 0 ? erros.join("; ") : undefined,
    metadata: resultado,
  });
  return NextResponse.json(resultado);
}

// Vercel Cron: sempre GET, com `Authorization: Bearer $CRON_SECRET`.
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
