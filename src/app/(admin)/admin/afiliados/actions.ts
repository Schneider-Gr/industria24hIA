"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

// Habilita/desabilita uma afiliação (UPDATE real do status).
// Escrita cross-seller garantida pela policy is_admin (migration 0004, FOR ALL).
// Server action é POST público: o gate de papel fica AQUI, não só no layout.
// Vocabulário segue o CHECK do banco: 'Pendente' | 'Aprovada' | 'Suspensa'
// (o antigo 'ativo'/'inativo' violava o constraint e o toggle sempre falhava).
export async function setStatusAfiliacao(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["Aprovada", "Suspensa"].includes(status)) {
    throw new Error("Parâmetros inválidos.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("afiliacoes").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/afiliados");
}
