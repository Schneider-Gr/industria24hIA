"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AdsFormState = { ok: boolean; error?: string };

// Guarda só a INTENÇÃO do seller (produto + orçamento/período). Publicar a
// campanha de verdade na Meta Ads exige OAuth explícito do usuário (MCP
// meta-ads) — não é feito aqui, status nasce "Pendente" até isso acontecer.
export async function patrocinarProduto(
  _prev: AdsFormState,
  formData: FormData,
): Promise<AdsFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const { data: loja } = await supabase
    .from("lojas")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!loja) return { ok: false, error: "Cadastre sua loja antes de anunciar." };

  const produtoId = formData.get("produto_id");
  const orcamento = Number(formData.get("orcamento_diario"));
  const dataInicio = formData.get("data_inicio");
  const dataFim = formData.get("data_fim");

  if (typeof produtoId !== "string" || !produtoId) {
    return { ok: false, error: "Selecione um produto." };
  }
  if (!orcamento || orcamento <= 0) {
    return { ok: false, error: "Informe um orçamento diário válido." };
  }
  if (typeof dataInicio !== "string" || !dataInicio) {
    return { ok: false, error: "Informe a data de início." };
  }

  const { error } = await supabase.from("produtos_patrocinados").insert({
    produto_id: produtoId,
    loja_id: loja.id,
    orcamento_diario: orcamento,
    data_inicio: dataInicio,
    data_fim: typeof dataFim === "string" && dataFim ? dataFim : null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/seller/ads");
  return { ok: true };
}

export async function pausarPatrocinio(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  await supabase.from("produtos_patrocinados").update({ status: "Pausado" }).eq("id", id);
  revalidatePath("/seller/ads");
}

export async function reativarPatrocinio(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  await supabase.from("produtos_patrocinados").update({ status: "Pendente" }).eq("id", id);
  revalidatePath("/seller/ads");
}
