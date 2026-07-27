"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { linkTrajeto } from "@/lib/maps";
import { enviarWhatsapp, mensagemRota } from "@/lib/whatsapp";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPCs/tabelas 0042 fora dos tipos gerados
type Db = any;

export async function atribuirRota(formData: FormData) {
  const loja = await getMinhaLoja();
  if (!loja) throw new Error("Sua loja não foi encontrada.");

  const rotaId = String(formData.get("rota_id") ?? "");
  const escolha = String(formData.get("parceiro") ?? ""); // "afiliado:<uuid>" | "parceiro:<uuid>"
  const [origem, id] = escolha.split(":");
  if (!rotaId || !id || !["afiliado", "parceiro"].includes(origem)) {
    throw new Error("Selecione um parceiro válido.");
  }

  const supabase = (await createClient()) as Db;
  const { error } = await supabase.rpc("atribuir_rota", {
    p_rota_id: rotaId,
    p_afiliado_id: origem === "afiliado" ? id : null,
    p_parceiro_id: origem === "parceiro" ? id : null,
  });
  if (error) throw new Error(error.message);

  // WhatsApp best-effort — falha aqui não desfaz a atribuição já gravada.
  try {
    const { data: rota } = await supabase
      .from("rotas")
      .select("origem_cep, destino_cep, link_mapa, frete_calculado")
      .eq("id", rotaId)
      .maybeSingle();
    const { data: disponiveis } = await supabase.rpc("parceiros_disponiveis_loja", { p_loja_id: loja.id });
    const alvo = (disponiveis ?? []).find(
      (p: { origem: string; id: string; telefone: string | null }) => p.origem === origem && p.id === id
    );
    if (rota && alvo?.telefone) {
      const enviado = await enviarWhatsapp(
        alvo.telefone,
        mensagemRota({
          origem: rota.origem_cep ?? "",
          destino: rota.destino_cep ?? "",
          // ponytail: fluxo manual (0042, tabela rotas) não tem comissão de
          // plataforma — só o despacho automático (corridas) tem. Mostra o
          // valor cheio aqui de propósito.
          ganho: rota.frete_calculado ? `R$ ${Number(rota.frete_calculado).toFixed(2)}` : "a combinar",
          linkMapa: rota.link_mapa ?? linkTrajeto(rota.origem_cep ?? "", rota.destino_cep ?? ""),
        })
      );
      if (enviado) {
        await supabase.from("rotas").update({ whatsapp_enviado_em: new Date().toISOString() }).eq("id", rotaId);
      }
    }
  } catch {
    // no-op: WhatsApp é best-effort, a atribuição já está gravada.
  }

  revalidatePath("/seller/rotas");
}
