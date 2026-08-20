"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { validarValorReembolso, validarDecisaoVendaFutura } from "@/lib/disputas";
import { uploadFotoMediacao } from "@/lib/disputa-mediacao-upload";
import { enviarBubblewhats, mensagemDecisaoDisputa } from "@/lib/bubblewhats";
import { normalizeWhatsapp } from "@/lib/whatsapp";

// Aviso de decisão via WhatsApp é best-effort — nunca desfaz a decisão já
// persistida no banco.
async function avisarDecisaoWhatsapp(telefone: string | null | undefined, mensagem: string) {
  if (!telefone) return;
  try {
    await enviarBubblewhats(normalizeWhatsapp(telefone), mensagem);
  } catch (erro) {
    Sentry.captureException(erro, { tags: { area: "disputas", gateway: "bubblewhats", signal: "decisao_disputa" } });
  }
}

// Admin envia mensagem no canal privado de mediação com um dos lados
// (comprador OU loja, nunca os dois na mesma linha — ver migration 0115).
// RLS disputa_mediacao_admin_all garante o acesso; o form escolhe o
// destinatário via campo oculto (dois formulários, um por thread na tela).
export async function enviarMensagemMediacao(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Apenas admin usa o canal de mediação.");

  const disputaId = formData.get("disputa_id");
  const destinatario = formData.get("destinatario");
  const corpo = formData.get("corpo");
  const foto = formData.get("foto");
  if (!disputaId || typeof disputaId !== "string") throw new Error("Disputa inválida.");
  if (destinatario !== "comprador" && destinatario !== "loja") {
    throw new Error("Destinatário inválido.");
  }
  if (!corpo || typeof corpo !== "string" || corpo.trim().length === 0) {
    throw new Error("Escreva uma mensagem.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada.");

  const fotoUrl =
    foto instanceof File && foto.size > 0
      ? await uploadFotoMediacao(supabase, disputaId, destinatario, foto)
      : null;

  const { error } = await supabase.from("disputa_mensagens_mediacao").insert({
    disputa_id: disputaId,
    destinatario,
    autor_id: user.id,
    corpo: corpo.trim(),
    foto_url: fotoUrl,
  });
  if (error) throw new Error("Não foi possível enviar a mensagem.");

  revalidatePath(`/admin/disputas/${disputaId}`);
}

// Admin decide o desfecho final da disputa (PRD 009 US04) — RLS
// disputas_admin_all + guard_campos_restritos (0104) garantem que só admin
// grava os campos de decisão; validação de valor roda aqui além do banco.
export async function decidirDisputa(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Apenas admin decide o desfecho de uma disputa.");

  const disputaId = formData.get("disputa_id");
  const decisao = formData.get("decisao");
  const justificativa = formData.get("justificativa");
  const valorRaw = formData.get("decisao_valor");

  if (!disputaId || typeof disputaId !== "string") throw new Error("Disputa inválida.");
  if (!decisao || typeof decisao !== "string") throw new Error("Selecione o desfecho.");
  if (!justificativa || typeof justificativa !== "string" || justificativa.trim().length === 0) {
    throw new Error("Justificativa é obrigatória.");
  }

  const supabase = await createClient();
  const { data: disputa } = await supabase
    .from("disputas")
    .select("id, linha_item_id, status, pedido_id, comprador_id, loja_id")
    .eq("id", disputaId)
    .maybeSingle();
  if (!disputa) throw new Error("Disputa não encontrada.");
  if (disputa.status === "resolvida") throw new Error("Disputa já foi decidida.");

  let valorItem = 0;
  let vendaFutura = false;
  if (disputa.linha_item_id) {
    const { data: item } = await supabase
      .from("linha_itens")
      .select("valor, venda_futura_id")
      .eq("id", disputa.linha_item_id)
      .maybeSingle();
    valorItem = item?.valor ?? 0;
    vendaFutura = item?.venda_futura_id != null;
  }

  const valor = valorRaw && typeof valorRaw === "string" && valorRaw.trim() ? Number(valorRaw) : null;
  validarValorReembolso(decisao, valor, valorItem);
  validarDecisaoVendaFutura(decisao, vendaFutura);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("disputas")
    .update({
      status: "resolvida",
      decisao,
      decisao_valor: valor,
      decisao_justificativa: justificativa.trim(),
      decidida_em: new Date().toISOString(),
      decidida_por: user?.id ?? null,
      resolvida_em: new Date().toISOString(),
    })
    .eq("id", disputaId);
  if (error) throw new Error("Não foi possível registrar a decisão.");

  const linkDisputa = `https://industria24.com.br/pedido/${disputa.pedido_id}/disputa`;
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id_venda, telefone_contato")
    .eq("id", disputa.pedido_id)
    .maybeSingle();
  const { data: loja } = await supabase.from("lojas").select("whatsapp").eq("id", disputa.loja_id).maybeSingle();

  await avisarDecisaoWhatsapp(
    pedido?.telefone_contato,
    mensagemDecisaoDisputa({
      idVenda: pedido?.id_venda ?? disputa.pedido_id,
      decisao,
      destinatario: "comprador",
      linkDisputa,
    })
  );
  await avisarDecisaoWhatsapp(
    loja?.whatsapp,
    mensagemDecisaoDisputa({
      idVenda: pedido?.id_venda ?? disputa.pedido_id,
      decisao,
      destinatario: "loja",
      linkDisputa,
    })
  );

  revalidatePath("/admin/disputas");
  revalidatePath(`/admin/disputas/${disputaId}`);
}
