"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

// Salva os banners da home na linha singleton (id=1) de marketplace_config.
// Escrita barrada pela RLS (policy admin) se o usuário não for admin; gate
// explícito aqui é defesa em profundidade, mesmo padrão do resto do admin.
export async function salvarMarketplaceConfig(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");

  const banner_desktop_url = String(formData.get("banner_desktop_url") ?? "").trim() || null;
  const banner_mobile_url = String(formData.get("banner_mobile_url") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("marketplace_config")
    .update({
      banner_desktop_url,
      banner_mobile_url,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/editar-marketplace");
}
