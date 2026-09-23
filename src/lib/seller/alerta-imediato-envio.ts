// Disparo do alerta imediato de estoque (PRD 047).
//
// Chamado na confirmação do pagamento. Best-effort por definição: o pagamento
// já está registrado no Asaas, e perder a confirmação por causa de um aviso
// seria trocar um problema pequeno por um grande. Nunca lança.
//
// A regra de QUEM alertar é pura e vive em `alerta-imediato.ts`; aqui fica o
// que precisa do banco: ler o pedido, respeitar o teto do dia e enviar.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { produtosParaAlertar, type ItemVendido } from "./alerta-imediato";
import { enviarBubblewhats, mensagemEstoqueCriticoSeller } from "@/lib/bubblewhats";
import { normalizeWhatsapp } from "@/lib/whatsapp";
import { enviarEmail, wrapperEmail, botaoCta } from "@/lib/email";

type ServiceClient = SupabaseClient<Database>;

const LINK_ESTOQUE = "https://industria24.com.br/seller/produtos";

/** Avisos imediatos por loja por dia. Acima disso o resumo diário basta: o
 * seller já recebe pedido pago, ruptura diária e avisos de venda futura. */
export const TETO_DIARIO_POR_LOJA = 5;

export function templateEstoqueCriticoImediato(args: {
  idVenda: string;
  produtos: { nome: string; saldo: number }[];
}): string {
  const linhas = args.produtos
    .map(
      (p) => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#121212;">
        ${p.nome}
        <span style="color:${p.saldo <= 0 ? "#C0392B" : "#6B6B6B"};"> — ${p.saldo <= 0 ? "esgotou" : `restam ${p.saldo} un`}</span>
      </td>
    </tr>`,
    )
    .join("");

  return wrapperEmail(`
    <h1 style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:19px;color:#121212;">A venda ${args.idVenda} mexeu no seu estoque</h1>
    <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6B6B6B;">Produto esgotado sai da vitrine até você repor.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhas}</table>
    ${botaoCta(LINK_ESTOQUE, "Repor estoque")}
  `);
}

export async function alertarEstoqueCriticoDoPedido(
  svc: ServiceClient,
  pedidoId: string,
): Promise<void> {
  const { data: pedido } = await svc
    .from("pedidos")
    .select("id_venda, loja_id")
    .eq("id", pedidoId)
    .maybeSingle();
  if (!pedido?.loja_id) return;

  const { data: linhas } = await svc
    .from("linha_itens")
    .select("produto_id, produto_nome, quantidade, venda_futura_id")
    .eq("pedido_id", pedidoId);
  if (!linhas?.length) return;

  const ids = [...new Set(linhas.map((l) => l.produto_id).filter(Boolean))] as string[];
  if (ids.length === 0) return;

  const { data: produtos } = await svc
    .from("produtos")
    .select("id, nome, estoque_atual, quantidade_minima")
    .in("id", ids);
  const porId = new Map((produtos ?? []).map((p) => [p.id, p]));

  const itens: ItemVendido[] = linhas.flatMap((l) => {
    const p = l.produto_id ? porId.get(l.produto_id) : undefined;
    if (!p) return [];
    return [{
      produto_id: p.id,
      nome: p.nome ?? l.produto_nome ?? "Produto",
      estoque_atual: p.estoque_atual,
      quantidade_minima: p.quantidade_minima,
      quantidade: l.quantidade ?? 0,
      venda_futura_id: l.venda_futura_id,
    }];
  });

  const alertar = produtosParaAlertar(itens);
  if (alertar.length === 0) return;

  // Idempotência: um aviso por pedido, mesmo se o webhook do Asaas repetir.
  const chave = `estoque-imediato:${pedidoId}`;
  const { data: jaEnviado } = await svc
    .from("alertas_enviados")
    .select("chave")
    .eq("chave", chave)
    .maybeSingle();
  if (jaEnviado) return;

  // Teto do dia por loja, contando os avisos imediatos já enviados hoje.
  const inicioDoDia = new Date();
  inicioDoDia.setUTCHours(0, 0, 0, 0);
  const { count } = await svc
    .from("alertas_enviados")
    .select("chave", { count: "exact", head: true })
    .like("chave", `estoque-imediato-loja:${pedido.loja_id}:%`)
    .gte("enviado_em", inicioDoDia.toISOString());
  if ((count ?? 0) >= TETO_DIARIO_POR_LOJA) return;

  const { data: loja } = await svc
    .from("lojas")
    .select("whatsapp, email")
    .eq("id", pedido.loja_id)
    .maybeSingle();

  const produtosMsg = alertar.map((p) => ({ nome: p.nome, saldo: p.saldo }));

  if (loja?.whatsapp) {
    const jid = normalizeWhatsapp(loja.whatsapp);
    if (jid) {
      await enviarBubblewhats(
        jid,
        mensagemEstoqueCriticoSeller({
          idVenda: pedido.id_venda,
          produtos: produtosMsg,
          linkEstoque: LINK_ESTOQUE,
        }),
      );
    }
  }

  if (loja?.email) {
    await enviarEmail({
      to: loja.email,
      subject: `Estoque baixo depois da venda ${pedido.id_venda}`,
      text:
        `A venda ${pedido.id_venda} mexeu no seu estoque:\n` +
        produtosMsg.map((p) => (p.saldo <= 0 ? `- ${p.nome}: esgotou` : `- ${p.nome}: restam ${p.saldo}`)).join("\n") +
        `\nRepor: ${LINK_ESTOQUE}`,
      html: templateEstoqueCriticoImediato({ idVenda: pedido.id_venda, produtos: produtosMsg }),
    });
  }

  const agora = new Date().toISOString();
  await svc.from("alertas_enviados").upsert(
    [
      { chave, enviado_em: agora },
      { chave: `estoque-imediato-loja:${pedido.loja_id}:${pedidoId}`, enviado_em: agora },
    ],
    { onConflict: "chave" },
  );
}
