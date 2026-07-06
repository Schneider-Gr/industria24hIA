"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Habilita/desabilita uma afiliação (UPDATE real do status).
// TODO: requer policy is_admin para escrita cross-seller em afiliacoes.
export async function setStatusAfiliacao(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["ativo", "inativo"].includes(status)) {
    throw new Error("Parâmetros inválidos.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("afiliacoes").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/afiliados");
}
