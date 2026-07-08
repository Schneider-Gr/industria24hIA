"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const STATUS = ["Aprovado", "Recusado", "Pendente", "rascunho"] as const;
type Status = (typeof STATUS)[number];

// Moderação de produto: UPDATE real de `status_produto`.
// Escrita cross-seller garantida pela policy is_admin (migration 0004, FOR ALL).
export async function setStatusProduto(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !STATUS.includes(status as Status)) {
    throw new Error("Parâmetros inválidos para moderação de produto.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("produtos")
    .update({ status_produto: status })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/produtos");
}
