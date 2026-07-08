"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

// CRUD real da taxonomia. Escrita garantida pela policy is_admin
// (migration 0004, FOR ALL). Server action é POST público: o gate de
// papel fica em cada action, não só no layout.

async function exigirAdmin() {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
}

export async function criarCategoria(formData: FormData) {
  await exigirAdmin();
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Nome da categoria é obrigatório.");

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").insert({ nome });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}

export async function renomearCategoria(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!id || !nome) throw new Error("Parâmetros inválidos.");

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").update({ nome }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}

export async function excluirCategoria(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Categoria inválida.");

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}

export async function criarSubcategoria(formData: FormData) {
  await exigirAdmin();
  const categoria_id = String(formData.get("categoria_id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!categoria_id || !nome) throw new Error("Parâmetros inválidos.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("subcategorias")
    .insert({ categoria_id, nome });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}

export async function excluirSubcategoria(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Subcategoria inválida.");

  const supabase = await createClient();
  const { error } = await supabase.from("subcategorias").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}
