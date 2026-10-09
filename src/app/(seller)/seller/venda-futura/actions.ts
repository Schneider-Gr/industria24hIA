"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser, getMinhaLoja } from "@/lib/auth";
import { validarCurva, type Degrau } from "@/lib/venda-futura/preco-curva";

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
  const valorRaw = String(formData.get("valor") ?? "").trim();
  // PRD 061: com curva o preço sai do à vista menos o degrau; o valor fixo é ignorado.
  let curva: Degrau[] = [];
  try {
    curva = JSON.parse(String(formData.get("curva") ?? "[]")) as Degrau[];
  } catch {
    throw new Error("Curva de desconto inválida.");
  }
  if (!Array.isArray(curva)) throw new Error("Curva de desconto inválida.");
  const erroCurva = validarCurva(curva);
  if (erroCurva) throw new Error(erroCurva);
  const valor = valorRaw && curva.length === 0 ? Number(valorRaw) : null;
  const producaoRaw = String(formData.get("producao_prevista") ?? "").trim();
  const producao_prevista = producaoRaw ? Number(producaoRaw) : null;
  if (producao_prevista !== null && (!Number.isInteger(producao_prevista) || producao_prevista <= 0)) {
    throw new Error("Produção prevista inválida.");
  }

  if (!produto_id || !previsao || !estoqueRaw || Number.isNaN(estoque)) {
    throw new Error("Preencha produto, previsão e estoque corretamente.");
  }
  if (valor !== null && (Number.isNaN(valor) || valor <= 0)) {
    throw new Error("Valor inválido.");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("vendas_futuras").insert({
    produto_id,
    previsao,
    estoque,
    valor,
    curva,
    producao_prevista,
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
