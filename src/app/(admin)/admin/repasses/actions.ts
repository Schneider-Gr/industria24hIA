"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { retentarRepasse } from "@/lib/repasses";

// Re-tentativa manual de um repasse falhou/inelegivel: revalida a
// elegibilidade da chave e, se ok, dispara a transferência PIX real.
// Gate isAdmin explícito porque a action usa service role (layout já
// protege a página, mas action é endpoint próprio).
export async function retentarRepasseAction(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Apenas admin.");
  if (!isServiceConfigured) throw new Error("Service role não configurado.");

  const repasseId = String(formData.get("repasse_id") ?? "");
  if (!repasseId) throw new Error("Repasse inválido.");

  await retentarRepasse(createServiceClient(), repasseId);
  revalidatePath("/admin/repasses");
}
