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

function num(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
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

  const valorPedidoMinimo = num(formData, "valor_pedido_minimo");
  if (valorPedidoMinimo != null && valorPedidoMinimo < 0) {
    return { ok: false, error: "O valor mínimo do pedido não pode ser negativo." };
  }

  const idExistente = str(formData, "id");

  const campos = {
    nome,
    cnpj: str(formData, "cnpj"),
    descricao: str(formData, "descricao"),
    whatsapp: str(formData, "whatsapp"),
    email: str(formData, "email"),
    // chave_pix/tipo_chave_pix SÓ entram aqui na CRIAÇÃO da loja (migration
    // 0035: o guard_campos_restritos bloqueia troca por este UPDATE genérico
    // — mudança de chave passa exclusivamente por alterarChavePixLoja, que
    // audita e reinicia a carência de repasse).
    ...(idExistente
      ? {}
      : {
          chave_pix: str(formData, "chave_pix"),
          tipo_chave_pix: str(formData, "tipo_chave_pix"),
        }),
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
  };

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

export type ChavePixFormState = { ok: boolean; error?: string };

// Troca de chave PIX: caminho dedicado (RPC alterar_chave_pix_loja), nunca
// o UPDATE genérico acima. Valida formato, audita e reinicia a carência de
// 24h antes de a chave ficar elegível para repasse automático (0035).
export async function alterarChavePix(
  _prev: ChavePixFormState,
  formData: FormData,
): Promise<ChavePixFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const lojaId = str(formData, "loja_id");
  const chavePix = str(formData, "chave_pix");
  const tipoChavePix = str(formData, "tipo_chave_pix");
  if (!lojaId || !chavePix || !tipoChavePix) {
    return { ok: false, error: "Preencha a chave PIX e o tipo." };
  }

  const { error } = await supabase.rpc("alterar_chave_pix_loja", {
    p_loja_id: lojaId,
    p_chave_pix: chavePix,
    p_tipo_chave_pix: tipoChavePix,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/seller/minha-loja");
  return { ok: true };
}
