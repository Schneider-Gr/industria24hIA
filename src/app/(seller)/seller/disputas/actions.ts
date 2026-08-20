"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadFotoMediacao } from "@/lib/disputa-mediacao-upload";
import { enviarBubblewhats, mensagemPropostaResolucaoComprador } from "@/lib/bubblewhats";
import { normalizeWhatsapp } from "@/lib/whatsapp";

// Loja propõe uma resolução (PRD 009 US02, revisão 0115) — não fecha mais
// direto: a disputa vai para "aguardando_confirmacao_comprador" e só o
// comprador, confirmando ou recusando, decide o desfecho (guard 0115).
// RLS disputas_seller_update + guard_campos_restritos já restringem essa
// transição ao dono da loja da disputa, a partir de aberta/em_atendimento_loja.
export async function proporResolucao(formData: FormData) {
  const disputaId = formData.get("disputa_id");
  if (!disputaId || typeof disputaId !== "string") throw new Error("Disputa inválida.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("disputas")
    .update({ status: "aguardando_confirmacao_comprador", proposta_resolucao_em: new Date().toISOString() })
    .eq("id", disputaId);
  if (error) throw new Error("Não foi possível registrar a proposta de resolução.");

  const { data: disputa } = await supabase.from("disputas").select("pedido_id").eq("id", disputaId).maybeSingle();
  if (disputa?.pedido_id) {
    const { data: pedido } = await supabase
      .from("pedidos")
      .select("id_venda, telefone_contato")
      .eq("id", disputa.pedido_id)
      .maybeSingle();
    if (pedido?.telefone_contato) {
      try {
        await enviarBubblewhats(
          normalizeWhatsapp(pedido.telefone_contato),
          mensagemPropostaResolucaoComprador({
            idVenda: pedido.id_venda,
            linkDisputa: `https://industria24.com.br/pedido/${disputa.pedido_id}/disputa`,
          })
        );
      } catch (erro) {
        Sentry.captureException(erro, {
          tags: { area: "disputas", gateway: "bubblewhats", signal: "proposta_resolucao" },
        });
      }
    }
  }

  revalidatePath("/seller/disputas");
  revalidatePath(`/seller/disputas/${disputaId}`);
}

// Mensagem da loja no canal privado de mediação (só visível a ela e ao
// admin) — usada quando a disputa já está em "em_mediacao_admin".
export async function responderMediacaoLoja(formData: FormData) {
  const disputaId = formData.get("disputa_id");
  const corpo = formData.get("corpo");
  const foto = formData.get("foto");
  if (!disputaId || typeof disputaId !== "string") throw new Error("Disputa inválida.");
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
      ? await uploadFotoMediacao(supabase, disputaId, "loja", foto)
      : null;

  const { error } = await supabase.from("disputa_mensagens_mediacao").insert({
    disputa_id: disputaId,
    destinatario: "loja",
    autor_id: user.id,
    corpo: corpo.trim(),
    foto_url: fotoUrl,
  });
  if (error) throw new Error("Não foi possível enviar a mensagem.");

  revalidatePath(`/seller/disputas/${disputaId}`);
}
