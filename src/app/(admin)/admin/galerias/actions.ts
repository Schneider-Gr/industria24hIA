"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Sem checagem de papel em JS: a policy is_admin (migration 0092) já nega
// insert/update/delete de não-admin. Erro do Postgres vira ?erro= visível na UI.
function erro(path: string, e: { message: string }): never {
  redirect(`${path}?erro=${encodeURIComponent(e.message)}`);
}

export async function criarGaleria(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "");
  const ordem = Number(formData.get("ordem") ?? 0);
  const ativo = formData.get("ativo") === "on";
  if (!titulo || !tipo) erro("/admin/galerias", { message: "Título e tipo são obrigatórios." });

  const supabase = await createClient();
  const { error } = await supabase
    .from("vitrine_galerias")
    .insert({ titulo, tipo, ordem, ativo });
  if (error) erro("/admin/galerias", error);
  revalidatePath("/admin/galerias");
  redirect("/admin/galerias");
}

export async function atualizarGaleria(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "");
  const ordem = Number(formData.get("ordem") ?? 0);
  const ativo = formData.get("ativo") === "on";
  if (!id || !titulo || !tipo) erro(`/admin/galerias/${id}`, { message: "Parâmetros inválidos." });

  const supabase = await createClient();
  const { error } = await supabase
    .from("vitrine_galerias")
    .update({ titulo, tipo, ordem, ativo })
    .eq("id", id);
  if (error) erro(`/admin/galerias/${id}`, error);
  revalidatePath("/admin/galerias");
  revalidatePath(`/admin/galerias/${id}`);
  redirect("/admin/galerias");
}

export async function excluirGaleria(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) erro("/admin/galerias", { message: "Galeria inválida." });

  const supabase = await createClient();
  const { error } = await supabase.from("vitrine_galerias").delete().eq("id", id);
  if (error) erro("/admin/galerias", error);
  revalidatePath("/admin/galerias");
  redirect("/admin/galerias");
}

export async function vincularProduto(formData: FormData) {
  const galeria_id = String(formData.get("galeria_id") ?? "");
  const produto_id = String(formData.get("produto_id") ?? "");
  const ordem = Number(formData.get("ordem") ?? 0);
  if (!galeria_id || !produto_id) {
    erro(`/admin/galerias/${galeria_id}`, { message: "Selecione um produto válido." });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("vitrine_galeria_produtos")
    .insert({ galeria_id, produto_id, ordem });
  if (error) erro(`/admin/galerias/${galeria_id}`, error);
  revalidatePath(`/admin/galerias/${galeria_id}`);
  redirect(`/admin/galerias/${galeria_id}`);
}

export async function desvincularProduto(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const galeria_id = String(formData.get("galeria_id") ?? "");
  if (!id) erro(`/admin/galerias/${galeria_id}`, { message: "Vínculo inválido." });

  const supabase = await createClient();
  const { error } = await supabase.from("vitrine_galeria_produtos").delete().eq("id", id);
  if (error) erro(`/admin/galerias/${galeria_id}`, error);
  revalidatePath(`/admin/galerias/${galeria_id}`);
  redirect(`/admin/galerias/${galeria_id}`);
}
