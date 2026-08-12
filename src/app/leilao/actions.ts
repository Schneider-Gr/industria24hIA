"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function publicarLeilao(formData: FormData) {
  const supabase = await createClient();
  // p_categoria_id/p_prazo_desejado são obrigatórios no Postgres (sem
  // default) mas aceitam NULL como valor — o tipo gerado só reflete a
  // obrigatoriedade do argumento, não a nullability da coluna.
  const { data, error } = await supabase.rpc("publicar_leilao_fabricante", {
    p_titulo: String(formData.get("titulo") ?? "").trim(),
    p_descricao: String(formData.get("descricao") ?? "").trim(),
    p_volume: String(formData.get("volume") ?? "").trim(),
    p_categoria_id: (String(formData.get("categoria_id") ?? "").trim() || null) as string,
    p_prazo_desejado: (String(formData.get("prazo_desejado") ?? "").trim() || null) as string,
    p_janela_fim: String(formData.get("janela_fim")),
  });
  if (error) throw new Error(error.message);
  redirect(`/leilao/${data}`);
}

export async function darLanceLeilao(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("dar_lance_leilao", {
    p_leilao_id: String(formData.get("leilao_id")),
    p_preco: Number(formData.get("preco")),
    p_prazo: String(formData.get("prazo") ?? "").trim(),
    p_condicoes: String(formData.get("condicoes") ?? "").trim() || undefined,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/seller/leiloes");
}

export async function adjudicarLeilao(formData: FormData) {
  const supabase = await createClient();
  const leilaoId = String(formData.get("leilao_id"));
  const { error } = await supabase.rpc("adjudicar_leilao", {
    p_leilao_id: leilaoId,
    p_lance_id: String(formData.get("lance_id")),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/leilao/${leilaoId}`);
}
