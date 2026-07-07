"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Atualiza o estado de fulfillment de um item. Upsert por linha_item_id (PK).
// Escrita só admin (RLS). Status validado pelo CHECK da tabela.
export async function atualizarEntrega(formData: FormData) {
  const linha_item_id = String(formData.get("linha_item_id") ?? "");
  const status = String(formData.get("status") ?? "").trim();
  const rastreio = String(formData.get("rastreio") ?? "").trim() || null;
  if (!linha_item_id || !status) throw new Error("Parâmetros inválidos.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("entregas")
    .upsert(
      { linha_item_id, status, rastreio, atualizado_em: new Date().toISOString() },
      { onConflict: "linha_item_id" },
    );
  if (error) throw new Error(error.message);
  revalidatePath("/admin/entregas");
}
