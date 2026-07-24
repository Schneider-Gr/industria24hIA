"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// CRUD real da taxonomia. As tabelas categorias/subcategorias não têm dono;
// as policies de escrita (admin) virão numa migration futura — enquanto isso
// o INSERT/UPDATE/DELETE pode ser barrado pela RLS deny-by-default (sem erro
// silencioso: o Supabase retorna erro de permissão, exibido pela action).
// Escrita garantida pela policy is_admin (migration 0004, FOR ALL).

export async function criarCategoria(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Nome da categoria é obrigatório.");

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").insert({ nome });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}

export async function renomearCategoria(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!id || !nome) throw new Error("Parâmetros inválidos.");

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").update({ nome }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}

export async function excluirCategoria(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Categoria inválida.");

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}

export async function criarSubcategoria(formData: FormData) {
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
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Subcategoria inválida.");

  const supabase = await createClient();
  const { error } = await supabase.from("subcategorias").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/categorias");
}
