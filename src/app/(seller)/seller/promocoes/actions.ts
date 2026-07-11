"use server";

import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { Json } from "@/lib/supabase/database.types";

export async function criarPromocao(formData: FormData) {
  const loja = await getMinhaLoja();
  if (!loja) {
    throw new Error("Você precisa estar logado como lojista para criar uma promoção.");
  }

  const produto_id = String(formData.get("produto_id") ?? "");
  const min_qtd = Number(formData.get("min_qtd"));
  const valor_unitario = Number(formData.get("valor_unitario"));
  const validade = String(formData.get("validade") ?? "").trim() || null;

  if (!produto_id || !Number.isFinite(min_qtd) || min_qtd <= 0 || !Number.isFinite(valor_unitario) || valor_unitario <= 0) {
    throw new Error("Preencha produto, quantidade mínima e valor unitário corretamente.");
  }

  const supabase = await createClient();

  // Só pode existir 1 linha ativa por produto (constraint 0023). Se já houver
  // uma, a nova faixa entra nela em vez de criar uma segunda linha ativa.
  const { data: existente } = await supabase
    .from("promocoes_progressivas")
    .select("id, faixas")
    .eq("produto_id", produto_id)
    .eq("ativo", true)
    .maybeSingle();

  const novaFaixa: Json = { min_qtd, valor_unitario, validade };
  const faixas: Json[] = Array.isArray(existente?.faixas)
    ? [...(existente.faixas as Json[]), novaFaixa]
    : [novaFaixa];

  const { error } = existente
    ? await supabase
        .from("promocoes_progressivas")
        .update({ faixas, ativo: true })
        .eq("id", existente.id)
    : await supabase.from("promocoes_progressivas").insert({
        produto_id,
        faixas,
        ativo: true,
      });

  if (error) {
    throw new Error(`Não foi possível criar a promoção: ${error.message}`);
  }

  revalidatePath("/seller/promocoes");
}

export async function alternarPromocao(formData: FormData) {
  const loja = await getMinhaLoja();
  if (!loja) {
    throw new Error("Você precisa estar logado como lojista para alterar uma promoção.");
  }

  const id = String(formData.get("id") ?? "");
  const ativoAtual = String(formData.get("ativo")) === "true";

  if (!id) {
    throw new Error("Promoção inválida.");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("promocoes_progressivas")
    .update({ ativo: !ativoAtual })
    .eq("id", id);

  if (error) {
    throw new Error(`Não foi possível atualizar a promoção: ${error.message}`);
  }

  revalidatePath("/seller/promocoes");
}
