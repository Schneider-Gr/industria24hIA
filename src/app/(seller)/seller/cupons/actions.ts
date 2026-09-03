"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";

// Cupom de loja (0157): custeado pela margem do próprio produto, não pela
// plataforma — reduz linha_itens.valor direto, mesmo mecanismo do desconto
// progressivo. Alvo restrito a produto/loja (trigger cupom_regra_valida_alvo
// barra categoria/tudo). Escrita garantida pela policy cupons_seller_manage
// (dono='loja' and loja_id = própria loja); dono/loja_id aqui são defesa em
// profundidade, mesmo padrão de admin/cupons/actions.ts.

async function exigirLoja() {
  const loja = await getMinhaLoja();
  if (!loja) throw new Error("Você precisa estar logado como lojista.");
  return loja;
}

type RegraInput = { alvo: string; alvo_id: string; tipo: string; valor: string };

function parseRegras(formData: FormData): RegraInput[] {
  const raw = String(formData.get("regras_json") ?? "[]");
  let regras: RegraInput[];
  try {
    regras = JSON.parse(raw);
  } catch {
    throw new Error("Regras inválidas.");
  }
  if (!Array.isArray(regras) || regras.length === 0) {
    throw new Error("O cupom precisa de pelo menos uma regra.");
  }
  return regras;
}

export async function criarCupomLoja(formData: FormData) {
  const loja = await exigirLoja();
  const codigo = String(formData.get("codigo") ?? "").trim();
  const validade_inicio = String(formData.get("validade_inicio") ?? "");
  const validade_fim = String(formData.get("validade_fim") ?? "");
  const valorMinimoRaw = String(formData.get("valor_minimo_pedido") ?? "").trim();
  const limiteGlobalRaw = String(formData.get("limite_global") ?? "").trim();
  const limitePorCliente = Number(formData.get("limite_por_cliente") ?? "1") || 1;

  if (!codigo) throw new Error("Código é obrigatório.");
  if (!validade_inicio || !validade_fim) throw new Error("Informe a janela de validade.");

  const regras = parseRegras(formData).map((r) => ({
    alvo: r.alvo,
    alvo_id: r.alvo === "loja" ? loja.id : r.alvo_id.trim() || null,
    tipo: r.tipo,
    valor: Number(r.valor),
  }));
  for (const r of regras) {
    if (r.alvo !== "produto" && r.alvo !== "loja") {
      throw new Error("Cupom de loja só aceita regra por produto ou pela loja inteira.");
    }
    if (!r.valor || r.valor <= 0) throw new Error("Toda regra precisa de um valor positivo.");
    if (r.tipo === "percentual" && r.valor > 100) throw new Error("Percentual não pode passar de 100.");
    if (r.alvo === "produto" && !r.alvo_id) throw new Error("Regra por produto exige o produto.");
  }

  const supabase = await createClient();
  const { data: cupom, error } = await supabase
    .from("cupons")
    .insert({
      codigo,
      dono: "loja",
      loja_id: loja.id,
      validade_inicio: new Date(validade_inicio).toISOString(),
      validade_fim: new Date(validade_fim).toISOString(),
      valor_minimo_pedido: valorMinimoRaw ? Number(valorMinimoRaw) : null,
      limite_global: limiteGlobalRaw ? Number(limiteGlobalRaw) : null,
      limite_por_cliente: limitePorCliente,
    })
    .select("id")
    .single();
  if (error || !cupom) throw new Error(error?.message ?? "Falha ao criar cupom.");

  const { error: regrasError } = await supabase
    .from("cupom_regras")
    .insert(regras.map((r) => ({ ...r, cupom_id: cupom.id })));
  if (regrasError) {
    await supabase.from("cupons").delete().eq("id", cupom.id);
    throw new Error(regrasError.message);
  }

  revalidatePath("/seller/cupons");
}

export async function alternarCupomLoja(formData: FormData) {
  await exigirLoja();
  const id = String(formData.get("id") ?? "");
  const ativo = formData.get("ativo") === "true";
  if (!id) throw new Error("Cupom inválido.");

  const supabase = await createClient();
  const { error } = await supabase.from("cupons").update({ ativo: !ativo }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/seller/cupons");
}
