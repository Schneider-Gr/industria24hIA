"use server";

import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Moderação de afiliação pelo seller. A autorização real é a RLS
// (afiliacoes_owner_all via produto + afiliacoes_loja_owner_all via loja, 0002/0010);
// getMinhaLoja aqui é gate de UX/defesa em profundidade. .select() detecta o
// UPDATE de 0 linhas (id de outra loja ou inexistente) que antes voltava "sucesso".
export async function moderarAfiliacao(formData: FormData) {
  const loja = await getMinhaLoja();
  if (!loja) throw new Error("Sua loja não foi encontrada.");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["Aprovada", "Suspensa"].includes(status)) {
    throw new Error("Parâmetros inválidos.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("afiliacoes")
    .update({ status })
    .eq("id", id)
    .select("id");

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Afiliação não encontrada na sua loja.");
  }
  revalidatePath("/seller/afiliados");
}
