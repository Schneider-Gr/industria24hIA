"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

// CMS institucional. Upsert por slug (chave primária). Escrita só admin
// (RLS); gate explícito aqui é defesa em profundidade.
export async function salvarPagina(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");

  const slug = String(formData.get("slug") ?? "").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const conteudo_rich = String(formData.get("conteudo_rich") ?? "");
  if (!slug || !titulo) throw new Error("Slug e título são obrigatórios.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("paginas_cms")
    .upsert(
      { slug, titulo, conteudo_rich, atualizado_em: new Date().toISOString() },
      { onConflict: "slug" },
    );
  if (error) throw new Error(error.message);
  revalidatePath("/admin/paginas");
}

export async function excluirPagina(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");

  const slug = String(formData.get("slug") ?? "");
  if (!slug) throw new Error("Página inválida.");

  const supabase = await createClient();
  const { error } = await supabase.from("paginas_cms").delete().eq("slug", slug);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/paginas");
}
