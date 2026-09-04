"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

// CRUD dos banners da faixa "Destaques da Indústria" (topo da home). Escrita
// garantida pela policy is_admin() (migration 0093, FOR ALL); gate explícito
// aqui é defesa em profundidade, mesmo padrão de categorias/actions.ts.

const POSICOES = ["topo", "meio"] as const;

function lerPosicao(formData: FormData) {
  const valor = String(formData.get("posicao") ?? "topo");
  return (POSICOES as readonly string[]).includes(valor) ? valor : "topo";
}

async function exigirAdmin() {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
}

export async function criarBannerDestaque(formData: FormData) {
  await exigirAdmin();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const imagem_url = String(formData.get("imagem_url") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();
  const badge = String(formData.get("badge") ?? "").trim() || null;
  if (!titulo || !imagem_url || !href) {
    throw new Error("Título, imagem e link são obrigatórios.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("banners_destaque")
    .insert({ titulo, imagem_url, href, badge, posicao: lerPosicao(formData) });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/destaques");
  revalidatePath("/");
}

export async function atualizarBannerDestaque(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const imagem_url = String(formData.get("imagem_url") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();
  const badge = String(formData.get("badge") ?? "").trim() || null;
  const ordem = Number(formData.get("ordem") ?? 0);
  const ativo = formData.get("ativo") === "on";
  if (!id || !titulo || !imagem_url || !href) {
    throw new Error("Título, imagem e link são obrigatórios.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("banners_destaque")
    .update({ titulo, imagem_url, href, badge, ordem, ativo, posicao: lerPosicao(formData) })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/destaques");
  revalidatePath("/");
}

export async function excluirBannerDestaque(formData: FormData) {
  await exigirAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Banner inválido.");

  const supabase = await createClient();
  const { error } = await supabase.from("banners_destaque").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/destaques");
  revalidatePath("/");
}
