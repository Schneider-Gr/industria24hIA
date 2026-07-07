"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser, getMinhaLoja } from "@/lib/auth";

export async function criarVendaFutura(formData: FormData) {
  const user = await getUser();
  if (!user) {
    throw new Error("Você precisa estar logado.");
  }

  const loja = await getMinhaLoja();
  if (!loja) {
    throw new Error("Nenhuma loja encontrada para este usuário.");
  }

  const produto_id = String(formData.get("produto_id") ?? "").trim();
  const previsao = String(formData.get("previsao") ?? "").trim();
  const estoqueRaw = String(formData.get("estoque") ?? "").trim();
  const estoque = Number(estoqueRaw);

  if (!produto_id || !previsao || !estoqueRaw || Number.isNaN(estoque)) {
    throw new Error("Preencha produto, previsão e estoque corretamente.");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("vendas_futuras").insert({
    produto_id,
    previsao,
    estoque,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/seller/venda-futura");
}

export async function removerVendaFutura(formData: FormData) {
  const user = await getUser();
  if (!user) {
    throw new Error("Você precisa estar logado.");
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    throw new Error("Registro inválido.");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("vendas_futuras").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/seller/venda-futura");
}
