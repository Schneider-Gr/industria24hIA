"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

const SITUACOES = ["Ativa", "Inativa", "EmAnalise"] as const;
type Situacao = (typeof SITUACOES)[number];

// Moderação de loja: UPDATE real de `situacao`. Escrita cross-seller
// garantida pela policy is_admin (migration 0004, FOR ALL).
// Server action é POST público: o gate de papel fica AQUI, não só no layout.
export async function setSituacaoLoja(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
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
