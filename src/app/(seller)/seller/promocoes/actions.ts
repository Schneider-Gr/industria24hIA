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
  // Teto de compradores por compra coletiva deste lote (migration 0076).
  // Vazio = sem limite; o banco exige >= 2 (coletiva com 1 pessoa não é coletiva).
  const maxBruto = String(formData.get("max_participantes") ?? "").trim();
  const max_participantes = maxBruto === "" ? null : Number(maxBruto);
  if (max_participantes !== null && (!Number.isInteger(max_participantes) || max_participantes < 2)) {
    throw new Error("O máximo de participantes deve ser um número inteiro a partir de 2 (ou vazio para sem limite).");
  }

  if (!produto_id || !Number.isFinite(min_qtd) || min_qtd <= 0 || !Number.isFinite(valor_unitario) || valor_unitario <= 0) {
    throw new Error("Preencha produto, quantidade mínima e valor unitário corretamente.");
  }

  const supabase = await createClient();

  // Só pode existir 1 linha ativa por produto (constraint 0023/0025). Se já
  // houver uma, a nova faixa entra nela em vez de criar uma segunda linha ativa.
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
        // Vazio ao acrescentar uma faixa não apaga o limite já cadastrado —
        // o form é genérico ("Nova promoção") e não vem pré-preenchido.
        .update({ faixas, ativo: true, ...(max_participantes === null ? {} : { max_participantes }) })
        .eq("id", existente.id)
    : await supabase.from("promocoes_progressivas").insert({
        produto_id,
        faixas,
        ativo: true,
        max_participantes,
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
