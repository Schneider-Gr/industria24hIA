"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

// Assistente que SUGERE estoque, valor e data de disponibilidade da venda
// futura a partir do histórico do próprio produto (sazonalidade). Só sugere
// — o seller revisa os campos pré-preenchidos e decide submeter, igual ao
// padrão de ia-actions.ts em seller/produtos.
export type SugestaoVendaFutura = {
  ok: boolean;
  error?: string;
  estoque?: number;
  valor?: number;
  previsao?: string; // YYYY-MM-DD
  justificativa?: string;
};

const SCHEMA = {
  type: "object" as const,
  properties: {
    estoque: { type: "number" as const, description: "Quantidade estimada da safra/lote" },
    valor: { type: "number" as const, description: "Preço unitário sugerido em reais" },
    previsao: {
      type: "string" as const,
      description: "Data de disponibilidade estimada, formato YYYY-MM-DD",
    },
    justificativa: {
      type: "string" as const,
      description: "1-2 frases explicando a estimativa (sazonalidade, histórico)",
    },
  },
  required: ["estoque", "valor", "previsao", "justificativa"],
  additionalProperties: false as const,
};

export async function sugerirVendaFutura(produtoId: string): Promise<SugestaoVendaFutura> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "IA não configurada: falta ANTHROPIC_API_KEY no ambiente." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data: produto } = await supabase
    .from("produtos")
    .select("id, nome, valor, lojas!inner(owner_id)")
    .eq("id", produtoId)
    .eq("lojas.owner_id", user.id)
    .maybeSingle();
  if (!produto) return { ok: false, error: "Produto não encontrado." };

  const { data: historico } = await supabase
    .from("vendas_futuras")
    .select("previsao, estoque, valor")
    .eq("produto_id", produtoId)
    .order("previsao", { ascending: false })
    .limit(8);

  const hoje = new Date().toISOString().slice(0, 10);
  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            "Você ajuda um produtor rural/industrial a cadastrar uma venda futura",
            "(pré-venda de safra ou lote de produção) num marketplace B2B de Manaus.",
            `Hoje é ${hoje}.`,
            `Produto: ${produto.nome}`,
            `Preço de venda normal (fora de safra): R$ ${produto.valor ?? "desconhecido"}`,
            "",
            (historico ?? []).length
              ? [
                  "Histórico de vendas futuras já cadastradas deste produto",
                  "(previsão | estoque | valor):",
                  ...(historico ?? []).map(
                    (h) => `- ${h.previsao ?? "?"} | ${h.estoque ?? "?"} | ${h.valor ?? "?"}`,
                  ),
                ].join("\n")
              : "Sem histórico anterior deste produto — estime pela sazonalidade típica do produto (ex: safra agrícola) e pelo preço normal informado.",
            "",
            "Sugira a próxima janela de disponibilidade (data futura em relação a hoje),",
            "a quantidade estimada e o preço unitário. Se o produto tiver sazonalidade",
            "agrícola conhecida (ex: milho, soja, mandioca), calibre a data pela época de colheita.",
          ].join("\n"),
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, error: "IA não retornou resultado." };
    }
    const parsed = JSON.parse(textBlock.text) as {
      estoque: number;
      valor: number;
      previsao: string;
      justificativa: string;
    };
    if (parsed.previsao < hoje) {
      return { ok: false, error: "IA sugeriu uma data no passado — tente novamente." };
    }
    return { ok: true, ...parsed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha na chamada de IA." };
  }
}
