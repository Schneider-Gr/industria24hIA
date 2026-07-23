"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Cancela uma coletiva Aberta da loja do seller. A RPC (migration 0070)
// valida no banco que o chamador é o dono da loja e que ninguém foi cobrado.
export async function cancelarColetiva(formData: FormData) {
  const coletivaId = String(formData.get("coletiva_id") ?? "");
  if (!coletivaId) throw new Error("Coletiva inválida.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("coletiva_cancelar", {
    p_coletiva_id: coletivaId,
  });
  if (error) throw new Error(`Não foi possível cancelar: ${error.message}`);

  revalidatePath("/seller/coletivas");
}
