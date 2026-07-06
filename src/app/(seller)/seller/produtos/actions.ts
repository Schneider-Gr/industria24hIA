"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/database.types";

export type ProdutoFormState = { ok: boolean; error?: string };

function num(fd: FormData, key: string): number | null {
  const v = fd.get(key);
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export async function criarProduto(
  _prev: ProdutoFormState,
  formData: FormData,
): Promise<ProdutoFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Faça login novamente." };

  const { data: loja } = await supabase.from("lojas").select("id").limit(1).maybeSingle();
  if (!loja) return { ok: false, error: "Cadastre sua loja antes de adicionar produtos." };

  const nome = str(formData, "nome");
  const valor = num(formData, "valor");
  if (!nome) return { ok: false, error: "O nome do produto é obrigatório." };
  if (valor == null) return { ok: false, error: "Informe um valor válido." };

  const payload: TablesInsert<"produtos"> = {
    loja_id: loja.id,
    nome,
    valor,
    descricao: str(formData, "descricao"),
    sku: str(formData, "sku"),
    cep_produto: str(formData, "cep_produto"),
    quantidade_minima: num(formData, "quantidade_minima"),
    estoque_atual: num(formData, "estoque_atual") ?? 0,
    categoria_id: str(formData, "categoria_id"),
    subcategoria_id: str(formData, "subcategoria_id"),
    permite_afiliacao: formData.get("permite_afiliacao") === "on",
    porcentagem_afiliado: num(formData, "porcentagem_afiliado"),
    altura: num(formData, "altura"),
    comprimento: num(formData, "comprimento"),
    largura: num(formData, "largura"),
    peso: num(formData, "peso"),
  };

  const { data: produto, error } = await supabase
    .from("produtos")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // Vincula centros de distribuição selecionados (multi).
  const centros = formData.getAll("centros").filter((c): c is string => typeof c === "string");
  if (centros.length) {
    const vinculos = centros.map((centro_id) => ({ produto_id: produto.id, centro_id }));
    const { error: errCentro } = await supabase.from("produto_centros").insert(vinculos);
    if (errCentro) return { ok: false, error: errCentro.message };
  }

  revalidatePath("/seller/produtos");
  return { ok: true };
}
