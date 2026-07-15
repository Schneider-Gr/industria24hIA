"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/database.types";

export type CreditoFormState = { ok: boolean; error?: string };

export async function solicitarCredito(
  _prev: CreditoFormState,
  formData: FormData,
): Promise<CreditoFormState> {
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
  if (!loja) return { ok: false, error: "Cadastre sua loja antes de solicitar crédito." };

  const valor = Number(formData.get("valor_solicitado"));
  if (!valor || valor <= 0) return { ok: false, error: "Informe um valor válido." };

  const finalidade = (formData.get("finalidade") as string | null)?.trim() || null;
  const prazoRaw = formData.get("prazo_meses");
  const prazo_meses = prazoRaw ? Number(prazoRaw) : null;

  const payload: TablesInsert<"solicitacoes_credito"> = {
    loja_id: loja.id,
    valor_solicitado: valor,
    finalidade,
    prazo_meses,
  };

  const { error } = await supabase.from("solicitacoes_credito").insert(payload);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/seller/credito");
  return { ok: true };
}

export async function cancelarCredito(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("solicitacoes_credito").update({ status: "Cancelada" }).eq("id", id);
  revalidatePath("/seller/credito");
}
