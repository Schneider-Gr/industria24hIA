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
  motivo?: "sazonalidade_conhecida" | "intervalo_historico" | "sem_base_conservador";
  justificativa?: string;
};

// "motivo" força a IA a declarar de onde tirou a data/estoque, em vez de
// inventar uma narrativa de sazonalidade para produto que não tem uma —
// foi o que aconteceu em teste com vergalhão (ver PR #259): a IA cumpriu
// a instrução de "calibrar pela sazonalidade" mesmo sem sazonalidade real,
// e produziu uma justificativa plausível mas infundada.
const MOTIVOS = ["sazonalidade_conhecida", "intervalo_historico", "sem_base_conservador"] as const;

const SCHEMA = {
  type: "object" as const,
  properties: {
    estoque: { type: "number" as const, description: "Quantidade estimada da safra/lote" },
    valor: { type: "number" as const, description: "Preço unitário sugerido em reais" },
    previsao: {
      type: "string" as const,
      description: "Data de disponibilidade estimada, formato YYYY-MM-DD",
    },
    motivo: {
      type: "string" as const,
      enum: [...MOTIVOS],
      description:
        "sazonalidade_conhecida: produto agrícola/sazonal com época real de safra/produção. " +
        "intervalo_historico: sem sazonalidade conhecida, mas há histórico — data baseada no " +
        "intervalo real entre os cadastros anteriores. sem_base_conservador: sem sazonalidade " +
        "e sem histórico suficiente — estimativa conservadora simples, sem inventar motivo.",
    },
    justificativa: {
      type: "string" as const,
      description:
        "1-2 frases. Precisa corresponder ao 'motivo' escolhido — nunca descrever ciclo de " +
        "produção, demanda ou sazonalidade que não foi informado como fato no contexto.",
    },
  },
  required: ["estoque", "valor", "previsao", "motivo", "justificativa"],
  additionalProperties: false as const,
};

function intervaloMedioDias(datas: string[]): number | null {
  if (datas.length < 2) return null;
  const ordenadas = [...datas].sort();
  const diffs: number[] = [];
  for (let i = 1; i < ordenadas.length; i++) {
    const dias = (Date.parse(ordenadas[i]) - Date.parse(ordenadas[i - 1])) / 86_400_000;
    if (dias > 0) diffs.push(dias);
  }
  if (!diffs.length) return null;
  return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
}

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
  const datasHistorico = (historico ?? []).map((h) => h.previsao).filter((d): d is string => !!d);
  const intervalo = intervaloMedioDias(datasHistorico);

  const SYSTEM = [
    "Você sugere estoque, preço e data de disponibilidade para uma venda futura",
    "(pré-venda de safra ou lote de produção) num marketplace B2B da Amazônia.",
    "",
    "'Venda futura' só faz sentido para produto que realmente tem uma janela de",
    "disponibilidade diferente do estoque normal: safra agrícola (soja, milho, mandioca,",
    "hortifruti) ou lote de produção programado. Para produto industrial de reposição",
    "contínua (cimento, vergalhão, tijolo, tinta, tubo etc.) NÃO existe sazonalidade real",
    "— não invente ciclo de produção, demanda ou colheita para esse tipo de produto.",
    "",
    "Escolha o campo 'motivo' com honestidade:",
    "- sazonalidade_conhecida: só se o produto for agrícola/sazonal de fato.",
    "- intervalo_historico: produto sem sazonalidade, mas há histórico — baseie a data",
    "  no intervalo médio real entre os cadastros anteriores (informado abaixo), não em",
    "  uma narrativa de ciclo produtivo.",
    "- sem_base_conservador: sem sazonalidade e sem histórico suficiente — sugira uma",
    "  janela conservadora simples (ex: 30 dias) e diga exatamente isso na justificativa,",
    "  sem inventar motivo de negócio.",
    "A justificativa tem que ser verificável a partir dos fatos deste prompt, nunca um",
    "motivo plausível mas não informado.",
  ].join("\n");

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            `Hoje é ${hoje}.`,
            `Produto: ${produto.nome}`,
            `Preço de venda normal: R$ ${produto.valor ?? "desconhecido"}`,
            "",
            (historico ?? []).length
              ? [
                  "Histórico de vendas futuras já cadastradas deste produto",
                  "(previsão | estoque | valor):",
                  ...(historico ?? []).map(
                    (h) => `- ${h.previsao ?? "?"} | ${h.estoque ?? "?"} | ${h.valor ?? "?"}`,
                  ),
                  intervalo != null
                    ? `Intervalo médio real entre os cadastros anteriores: ${intervalo} dias.`
                    : "Histórico insuficiente para calcular intervalo médio.",
                ].join("\n")
              : "Sem histórico anterior deste produto.",
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
      motivo: (typeof MOTIVOS)[number];
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
