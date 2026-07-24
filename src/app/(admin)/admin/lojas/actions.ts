"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const SITUACOES = ["Ativa", "Inativa", "EmAnalise"] as const;
type Situacao = (typeof SITUACOES)[number];

// Moderação de loja: UPDATE real de `situacao`. A RLS atual escopa por
// owner_id; o UPDATE do admin só surtirá efeito quando existir a policy
// is_admin (migration 0004, FOR ALL) garante o update cross-seller.
export async function setSituacaoLoja(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const situacao = String(formData.get("situacao") ?? "");

  if (!id || !SITUACOES.includes(situacao as Situacao)) {
    throw new Error("Parâmetros inválidos para moderação de loja.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("lojas")
    .update({ situacao })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/lojas");
}
