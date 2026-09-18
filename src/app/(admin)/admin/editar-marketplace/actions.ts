"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";
import { parseBannersHero } from "@/lib/banners-hero";

// Salva a galeria do carousel da home na linha singleton (id=1) de
// marketplace_config. Escrita barrada pela RLS (policy admin) se o usuário não
// for admin; gate explícito aqui é defesa em profundidade.
export async function salvarMarketplaceConfig(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");

  let bruto: unknown;
  try {
    bruto = JSON.parse(String(formData.get("banners_hero") ?? "[]"));
  } catch {
    throw new Error("Galeria inválida.");
  }
  const banners_hero = parseBannersHero(bruto).slice(0, 20);

  const supabase = await createClient();
  const { error } = await supabase
    .from("marketplace_config")
    .update({ banners_hero, atualizado_em: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/editar-marketplace");
  revalidatePath("/");
}
