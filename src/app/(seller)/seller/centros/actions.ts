"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/database.types";

export type CentroFormState = { ok: boolean; error?: string };

export async function criarCentro(
  _prev: CentroFormState,
  formData: FormData,
): Promise<CentroFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  // owner_id explícito: a policy pública lojas_public_read (Ativa) combina via OR
  // com a do dono, então sem este filtro isto podia gravar o centro na loja de
  // OUTRO seller (bug real encontrado em QA — ver auth.ts:getMinhaLoja).
  const { data: loja } = await supabase
    .from("lojas")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!loja) return { ok: false, error: "Cadastre sua loja antes de criar centros." };

  const nome = (formData.get("nome") as string | null)?.trim();
  if (!nome) return { ok: false, error: "O nome do centro é obrigatório." };

  const localizacaoRaw = (formData.get("localizacao") as string | null)?.trim();

  const payload: TablesInsert<"centros_distribuicao"> = {
    loja_id: loja.id,
    nome,
    localizacao: localizacaoRaw || null,
  };

  const { error } = await supabase.from("centros_distribuicao").insert(payload);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/seller/centros");
  return { ok: true };
}

// Ícone de lixeira da tabela "Centros adicionados por você" no Bubble.
// Desde a 0175 o centro carrega saldo de estoque e sustenta o invariante de um
// local padrão por loja, então o delete NÃO é mais incondicional: a guarda vive
// no banco (centro_guarda_exclusao) e aqui só traduzimos a recusa para o seller,
// que antes via o botão não fazer nada.
export async function excluirCentro(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: loja } = await supabase
    .from("lojas")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!loja) return;

  const { error } = await supabase
    .from("centros_distribuicao")
    .delete()
    .eq("id", id)
    .eq("loja_id", loja.id);

  revalidatePath("/seller/centros");
  if (error) redirect(`/seller/centros?erro=${encodeURIComponent(error.message)}`);
}
