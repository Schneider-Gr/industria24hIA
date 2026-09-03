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

// Server Action nunca lança para reportar erro de negócio: em produção o
// React troca a mensagem por "Minified React error #441", e o usuário fica
// sem saber o que deu errado. Retornamos { erro } e o form exibe.
export type ResultadoAcao = { erro?: string };

async function exigirLoja() {
  return await getMinhaLoja();
}

type RegraInput = { alvo: string; alvo_id: string; tipo: string; valor: string };

function parseRegras(formData: FormData): RegraInput[] | null {
  const raw = String(formData.get("regras_json") ?? "[]");
  let regras: RegraInput[];
  try {
    regras = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(regras) || regras.length === 0) return null;
  return regras;
}

function mensagemDoBanco(msg: string): string {
  if (msg.includes("cupons_codigo") || msg.includes("duplicate key")) {
    return "Já existe um cupom com esse código. Escolha outro.";
  }
  return msg;
}

export async function criarCupomLoja(formData: FormData): Promise<ResultadoAcao> {
  const loja = await exigirLoja();
  if (!loja) return { erro: "Você precisa estar logado como lojista." };
  const codigo = String(formData.get("codigo") ?? "").trim();
  const validade_inicio = String(formData.get("validade_inicio") ?? "");
  const validade_fim = String(formData.get("validade_fim") ?? "");
  const valorMinimoRaw = String(formData.get("valor_minimo_pedido") ?? "").trim();
  const limiteGlobalRaw = String(formData.get("limite_global") ?? "").trim();
  const limitePorCliente = Number(formData.get("limite_por_cliente") ?? "1") || 1;

  if (!codigo) return { erro: "Código é obrigatório." };
  if (!validade_inicio || !validade_fim) return { erro: "Informe a janela de validade." };

  const regrasCruas = parseRegras(formData);
  if (!regrasCruas) return { erro: "O cupom precisa de pelo menos uma regra válida." };

  const regras = regrasCruas.map((r) => ({
    alvo: r.alvo,
    alvo_id: r.alvo === "loja" ? loja.id : r.alvo_id.trim() || null,
    tipo: r.tipo,
    valor: Number(r.valor),
  }));
  for (const r of regras) {
    if (r.alvo !== "produto" && r.alvo !== "loja") {
      return { erro: "Cupom de loja só aceita regra por produto ou pela loja inteira." };
    }
    if (!r.valor || r.valor <= 0) return { erro: "Toda regra precisa de um valor positivo." };
    if (r.tipo === "percentual" && r.valor > 100) return { erro: "Percentual não pode passar de 100." };
    if (r.alvo === "produto" && !r.alvo_id) return { erro: "Escolha o produto da regra." };
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
  if (error || !cupom) return { erro: mensagemDoBanco(error?.message ?? "Falha ao criar cupom.") };

  const { error: regrasError } = await supabase
    .from("cupom_regras")
    .insert(regras.map((r) => ({ ...r, cupom_id: cupom.id })));
  if (regrasError) {
    await supabase.from("cupons").delete().eq("id", cupom.id);
    return { erro: mensagemDoBanco(regrasError.message) };
  }

  revalidatePath("/seller/cupons");
  return {};
}

// Usada direto como <form action={...}> num Server Component, então retorna
// void. Sem throw: erro aqui só reverteria o botão, e um throw viraria o
// erro genérico #441 na tela.
export async function alternarCupomLoja(formData: FormData): Promise<void> {
  if (!(await exigirLoja())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const ativo = formData.get("ativo") === "true";

  const supabase = await createClient();
  await supabase.from("cupons").update({ ativo: !ativo }).eq("id", id);
  revalidatePath("/seller/cupons");
}
