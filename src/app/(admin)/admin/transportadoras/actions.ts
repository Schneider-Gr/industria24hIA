"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/database.types";

// CRUD de transportadoras globais (admin). Escrita protegida pela RLS
// transportadoras_admin_all; aqui só validamos entrada e montamos o payload.

function parseIntOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : null;
}

export async function salvarTransportadora(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim() || null;
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Nome da transportadora é obrigatório.");

  const fonte = String(formData.get("fonte") ?? "interna");
  if (fonte !== "interna" && fonte !== "mercado_envios") {
    throw new Error("Fonte inválida.");
  }

  const payload: TablesInsert<"transportadoras"> = {
    nome,
    fonte,
    ativo: formData.get("ativo") === "on",
    prazo_dias: parseIntOrNull(formData.get("prazo_dias")),
    loja_id: null, // admin cadastra transportadoras globais
  };

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("transportadoras").update(payload).eq("id", id)
    : await supabase.from("transportadoras").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/transportadoras");
}

export async function alternarTransportadora(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const ativo = formData.get("ativo") === "true"; // estado atual → inverte
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("transportadoras")
    .update({ ativo: !ativo })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/transportadoras");
}
