"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/database.types";

// Campos de texto simples da loja. owner_id/id/situacao não vêm do form.
function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export type LojaFormState = { ok: boolean; error?: string };

export async function salvarLoja(
  _prev: LojaFormState,
  formData: FormData,
): Promise<LojaFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const nome = str(formData, "nome");
  if (!nome) return { ok: false, error: "O nome da loja é obrigatório." };

  const campos = {
    nome,
    cnpj: str(formData, "cnpj"),
    descricao: str(formData, "descricao"),
    whatsapp: str(formData, "whatsapp"),
    email: str(formData, "email"),
    chave_pix: str(formData, "chave_pix"),
    tipo_chave_pix: str(formData, "tipo_chave_pix"),
    cep: str(formData, "cep"),
    cidade: str(formData, "cidade"),
    bairro: str(formData, "bairro"),
    rua: str(formData, "rua"),
    numero: str(formData, "numero"),
    estado: str(formData, "estado"),
    complemento: str(formData, "complemento"),
    logotipo_url: str(formData, "logotipo_url"),
    banner_url: str(formData, "banner_url"),
    permite_retirada_na_loja: formData.get("permite_retirada_na_loja") === "on",
  };

  const idExistente = str(formData, "id");

  if (idExistente) {
    // .eq(owner_id) + select: UPDATE de 0 linhas (id alheio/inexistente que a
    // RLS filtra em silêncio) não pode voltar { ok: true }.
    const { data: atualizadas, error } = await supabase
      .from("lojas")
      .update(campos)
      .eq("id", idExistente)
      .eq("owner_id", user.id)
      .select("id");
    if (error) return { ok: false, error: error.message };
    if (!atualizadas || atualizadas.length === 0) {
      return { ok: false, error: "Loja não encontrada ou sem permissão para editar." };
    }
  } else {
    const payload: TablesInsert<"lojas"> = { ...campos, owner_id: user.id };
    const { error } = await supabase.from("lojas").insert(payload);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/seller/minha-loja");
  return { ok: true };
}
