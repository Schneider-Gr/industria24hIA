"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

export async function moderarParceiro(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["Aprovado", "Suspenso", "Pendente"].includes(status)) throw new Error("Status inválido.");

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0039 fora dos tipos gerados
  const { error } = await (supabase as any)
    .from("parceiros_logisticos")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/parceiros");
}
