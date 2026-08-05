"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Loja marca a disputa como resolvida (PRD 009 US02) — RLS
// disputas_seller_update já restringe ao dono da loja da disputa.
export async function marcarResolvidaPelaLoja(formData: FormData) {
  const disputaId = formData.get("disputa_id");
  if (!disputaId || typeof disputaId !== "string") throw new Error("Disputa inválida.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("disputas")
    .update({ status: "resolvida_pela_loja", resolvida_em: new Date().toISOString() })
    .eq("id", disputaId);
  if (error) throw new Error("Não foi possível marcar como resolvida.");

  revalidatePath("/seller/disputas");
  revalidatePath(`/seller/disputas/${disputaId}`);
}
