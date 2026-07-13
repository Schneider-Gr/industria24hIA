"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function db() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPCs 0040 fora dos tipos gerados
  return supabase as any;
}

export async function publicarLeilao(formData: FormData) {
  const supabase = await db();
  const { data, error } = await supabase.rpc("publicar_leilao_fabricante", {
    p_titulo: String(formData.get("titulo") ?? "").trim(),
    p_descricao: String(formData.get("descricao") ?? "").trim(),
    p_volume: String(formData.get("volume") ?? "").trim(),
    p_categoria_id: String(formData.get("categoria_id") ?? "").trim() || null,
    p_prazo_desejado: String(formData.get("prazo_desejado") ?? "").trim() || null,
    p_janela_fim: String(formData.get("janela_fim")),
  });
  if (error) throw new Error(error.message);
  redirect(`/leilao/${data}`);
}

export async function darLanceLeilao(formData: FormData) {
  const supabase = await db();
  const { error } = await supabase.rpc("dar_lance_leilao", {
    p_leilao_id: String(formData.get("leilao_id")),
    p_preco: Number(formData.get("preco")),
    p_prazo: String(formData.get("prazo") ?? "").trim(),
    p_condicoes: String(formData.get("condicoes") ?? "").trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/seller/leiloes");
}

export async function adjudicarLeilao(formData: FormData) {
  const supabase = await db();
  const leilaoId = String(formData.get("leilao_id"));
  const { error } = await supabase.rpc("adjudicar_leilao", {
    p_leilao_id: leilaoId,
    p_lance_id: String(formData.get("lance_id")),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/leilao/${leilaoId}`);
}
