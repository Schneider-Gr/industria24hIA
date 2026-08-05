"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth";

const SITUACOES = ["Ativa", "Inativa", "EmAnalise"] as const;
type Situacao = (typeof SITUACOES)[number];

// Moderação de loja: UPDATE real de `situacao`. Escrita cross-seller
// garantida pela policy is_admin (migration 0004, FOR ALL).
// Server action é POST público: o gate de papel fica AQUI, não só no layout.
export async function setSituacaoLoja(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Acesso restrito a administradores.");
  const id = String(formData.get("id") ?? "");
  const situacao = String(formData.get("situacao") ?? "");

  if (!id || !SITUACOES.includes(situacao as Situacao)) {
    throw new Error("Parâmetros inválidos para moderação de loja.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("lojas")
    .update({ situacao })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/lojas");
}

// Edição dos dados cadastrais da loja pelo admin. Mesmos campos de salvarLoja
// (seller), sem o filtro owner_id — escrita cross-seller pela policy is_admin
// (0004). chave_pix NÃO entra: o guard_campos_restritos (0035) só aceita troca
// pelo RPC alterar_chave_pix_loja, que audita e reinicia a carência de repasse.
function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

function num(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export type LojaAdminFormState = { ok: boolean; error?: string };

export async function salvarLojaAdmin(
  _prev: LojaAdminFormState,
  formData: FormData,
): Promise<LojaAdminFormState> {
  if (!(await isAdmin())) return { ok: false, error: "Acesso restrito a administradores." };

  const id = str(formData, "id");
  const nome = str(formData, "nome");
  if (!id) return { ok: false, error: "Loja inválida." };
  if (!nome) return { ok: false, error: "O nome da loja é obrigatório." };

  const valorPedidoMinimo = num(formData, "valor_pedido_minimo");
  if (valorPedidoMinimo != null && valorPedidoMinimo < 0) {
    return { ok: false, error: "O valor mínimo do pedido não pode ser negativo." };
  }

  const supabase = await createClient();
  const { data: atualizadas, error } = await supabase
    .from("lojas")
    .update({
      nome,
      cnpj: str(formData, "cnpj"),
      descricao: str(formData, "descricao"),
      whatsapp: str(formData, "whatsapp"),
      email: str(formData, "email"),
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
      valor_pedido_minimo: valorPedidoMinimo,
    })
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!atualizadas || atualizadas.length === 0) {
    return { ok: false, error: "Loja não encontrada ou sem permissão para editar." };
  }

  revalidatePath(`/admin/lojas/${id}`);
  revalidatePath("/admin/lojas");
  return { ok: true };
}
