"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

// Grava a imagem já enviada pro bucket 'produtos' (upload client-side, ver
// ImageUpload) — mesmo padrão de anexarImagemProduto do seller, mas com o
// gate de admin em vez de dono da loja.
export async function anexarImagemProdutoAdmin(produtoId: string, url: string) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const supabase = await createClient();
  const { data: max } = await supabase
    .from("produto_imagens")
    .select("ordem")
    .eq("produto_id", produtoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const proximaOrdem = (max?.ordem ?? -1) + 1;
  const { error } = await supabase
    .from("produto_imagens")
    .insert({ produto_id: produtoId, url, ordem: proximaOrdem });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/produtos/${produtoId}`);
}

export async function excluirImagemProduto(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const id = String(formData.get("id") ?? "");
  const produtoId = String(formData.get("produtoId") ?? "");
  if (!id || !produtoId) throw new Error("Parâmetros inválidos.");

  const supabase = await createClient();
  const { error } = await supabase.from("produto_imagens").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/produtos/${produtoId}`);
}

// Reordena a galeria inteira: recebe os ids na ordem final desejada e grava
// 0..n-1 em `ordem` — normaliza empates em vez de só trocar dois valores.
export async function reordenarImagens(produtoId: string, idsEmOrdem: string[]) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const supabase = await createClient();
  for (let i = 0; i < idsEmOrdem.length; i++) {
    const { error } = await supabase
      .from("produto_imagens")
      .update({ ordem: i })
      .eq("id", idsEmOrdem[i]);
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/admin/produtos/${produtoId}`);
}
