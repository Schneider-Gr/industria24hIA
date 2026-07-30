"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getMinhaLoja } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { Json } from "@/lib/supabase/database.types";

// Gera um lote de faixas de desconto progressivo por IA (Claude Haiku, mesma
// escolha de modelo da curadoria de produto) a partir do preço atual do
// produto, e já grava como promoção ativa — mesmo formato usado por
// criarPromocao em actions.ts (uma linha ativa por produto, faixas em Json[]).
export type LoteDescontosResult = {
  ok: boolean;
  error?: string;
  faixas?: { min_qtd: number; valor_unitario: number }[];
};

const SCHEMA = {
  type: "object" as const,
  properties: {
    faixas: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          min_qtd: { type: "integer" as const, description: "Quantidade mínima para a faixa, crescente" },
          valor_unitario: { type: "number" as const, description: "Preço unitário nessa faixa, em reais, decrescente" },
        },
        required: ["min_qtd", "valor_unitario"],
        additionalProperties: false as const,
      },
    },
  },
  required: ["faixas"],
  additionalProperties: false as const,
};

export async function gerarLoteDescontosIA(produtoId: string): Promise<LoteDescontosResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "IA não configurada: falta ANTHROPIC_API_KEY no ambiente." };
  }

  const loja = await getMinhaLoja();
  if (!loja) return { ok: false, error: "Você precisa estar logado como lojista." };

  const supabase = await createClient();
  const { data: produto } = await supabase
    .from("produtos")
    .select("id, nome, valor")
    .eq("id", produtoId)
    .eq("loja_id", loja.id)
    .maybeSingle();
  if (!produto) return { ok: false, error: "Produto não encontrado nesta loja." };

  const client = new Anthropic();
  let faixas: { min_qtd: number; valor_unitario: number }[];
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            "Você monta tabelas de desconto progressivo por quantidade para um",
            "marketplace B2B industrial. Gere de 3 a 5 faixas de quantidade mínima",
            "crescente com preço unitário decrescente, com descontos plausíveis",
            "(entre 3% e 20% de desconto sobre o preço atual, maior desconto na",
            "maior quantidade).",
            "",
            `Produto: ${produto.nome}`,
            `Preço unitário atual: R$ ${produto.valor}`,
          ].join("\n"),
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: "IA não retornou resultado." };
    }
    const parsed = JSON.parse(textBlock.text) as { faixas: { min_qtd: number; valor_unitario: number }[] };
    faixas = parsed.faixas;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha na chamada de IA." };
  }

  if (!Array.isArray(faixas) || faixas.length < 3 || faixas.length > 5) {
    return { ok: false, error: "IA não sugeriu faixas válidas." };
  }
  for (const f of faixas) {
    if (!Number.isFinite(f.min_qtd) || f.min_qtd <= 0 || !Number.isFinite(f.valor_unitario) || f.valor_unitario <= 0) {
      return { ok: false, error: "IA retornou faixa inválida." };
    }
  }

  const faixasOrdenadas = [...faixas].sort((a, b) => a.min_qtd - b.min_qtd);
  const faixasJson: Json[] = faixasOrdenadas.map((f) => ({ min_qtd: f.min_qtd, valor_unitario: f.valor_unitario, validade: null }));

  // Mesma regra de criarPromocao: 1 linha ativa por produto (constraint 0023/0025).
  const { data: existente } = await supabase
    .from("promocoes_progressivas")
    .select("id")
    .eq("produto_id", produtoId)
    .eq("ativo", true)
    .maybeSingle();

  const { error } = existente
    ? await supabase
        .from("promocoes_progressivas")
        .update({ faixas: faixasJson, ativo: true })
        .eq("id", existente.id)
    : await supabase.from("promocoes_progressivas").insert({
        produto_id: produtoId,
        faixas: faixasJson,
        ativo: true,
      });

  if (error) {
    return { ok: false, error: `Não foi possível salvar o lote: ${error.message}` };
  }

  revalidatePath("/seller/promocoes");
  return { ok: true, faixas: faixasOrdenadas };
}
