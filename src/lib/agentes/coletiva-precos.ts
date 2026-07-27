// Agente que FORMULA a curva de preço da compra coletiva (lotes, meta, prazo,
// participantes) — grafo LangGraph propor → validar → corrigir, mesmo desenho
// do tools/design-loop:
//
//   START → propor(LLM) → validar(determinístico) ──ok──→ END
//              ↑                    │
//              └──(erros && iter<3)─┘
//
// O LLM NUNCA é a última palavra sobre dinheiro: o validador é aritmético e
// repete as mesmas regras que o trigger coletiva_regras_validar (0076) aplica
// no banco. A sugestão volta pro seller aprovar — nada é gravado aqui.

import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";
import type { Lote } from "@/lib/coletiva";

export const MAX_ITER = 3;

export type SugestaoRegra = {
  meta_qtd: number;
  prazo_dias: number;
  min_participantes: number;
  max_participantes: number | null;
  lotes: Lote[];
  justificativa: string;
};

export type ContextoProduto = {
  nome: string;
  preco_base: number;
  estoque_atual: number;
  unidades_vendidas_90d: number;
  pedidos_90d: number;
  qtd_media_por_pedido: number;
  coletivas_anteriores: { meta_qtd: number; qtd_atual: number; status: string }[];
};

// ---------- validador determinístico ----------
export function validarSugestao(s: SugestaoRegra | null, ctx: ContextoProduto): string[] {
  const erros: string[] = [];
  if (!s) return ["Nenhuma sugestão foi produzida."];

  if (!Array.isArray(s.lotes) || s.lotes.length === 0) erros.push("Sem lotes.");
  if (s.lotes.length > 4) erros.push("No máximo 4 lotes.");

  let qtdAnterior = 0;
  let valorAnterior = Infinity;
  for (const [i, l] of s.lotes.entries()) {
    if (!Number.isInteger(l.min_qtd) || l.min_qtd < 1) {
      erros.push(`Lote ${i + 1}: quantidade mínima inválida.`);
      continue;
    }
    if (!(l.valor_unitario > 0)) {
      erros.push(`Lote ${i + 1}: valor unitário inválido.`);
      continue;
    }
    if (l.valor_unitario >= ctx.preco_base) {
      erros.push(
        `Lote ${i + 1} (R$ ${l.valor_unitario}) não dá desconto sobre o preço base R$ ${ctx.preco_base}.`,
      );
    }
    // Piso de margem: 30% abaixo do preço base já é agressivo para B2B.
    if (l.valor_unitario < ctx.preco_base * 0.7) {
      erros.push(
        `Lote ${i + 1}: desconto acima de 30% (R$ ${l.valor_unitario} sobre base R$ ${ctx.preco_base}).`,
      );
    }
    if (i > 0 && l.min_qtd <= qtdAnterior) {
      erros.push(`Lote ${i + 1}: quantidade precisa ser maior que a do lote anterior.`);
    }
    if (i > 0 && l.valor_unitario >= valorAnterior) {
      erros.push(`Lote ${i + 1}: preço precisa ser menor que o do lote anterior.`);
    }
    if (l.min_qtd > ctx.estoque_atual) {
      erros.push(`Lote ${i + 1}: ${l.min_qtd} un acima do estoque (${ctx.estoque_atual}).`);
    }
    qtdAnterior = l.min_qtd;
    valorAnterior = l.valor_unitario;
  }

  const primeiro = s.lotes[0]?.min_qtd;
  if (!Number.isInteger(s.meta_qtd) || s.meta_qtd < 1) erros.push("Meta inválida.");
  else {
    if (primeiro != null && s.meta_qtd < primeiro) {
      erros.push("A meta não pode ser menor que o primeiro lote.");
    }
    if (s.meta_qtd > ctx.estoque_atual) {
      erros.push(`Meta ${s.meta_qtd} un acima do estoque (${ctx.estoque_atual}).`);
    }
  }

  if (!Number.isInteger(s.prazo_dias) || s.prazo_dias < 1 || s.prazo_dias > 30) {
    erros.push("Prazo precisa ficar entre 1 e 30 dias.");
  }
  if (!Number.isInteger(s.min_participantes) || s.min_participantes < 2) {
    erros.push("Mínimo de participantes precisa ser 2 ou mais.");
  }
  if (
    s.max_participantes != null &&
    (!Number.isInteger(s.max_participantes) || s.max_participantes < s.min_participantes)
  ) {
    erros.push("Máximo de participantes precisa ser maior ou igual ao mínimo.");
  }
  if (!s.justificativa?.trim()) erros.push("Falta a justificativa.");

  return erros;
}

// ---------- grafo ----------
const State = Annotation.Root({
  ctx: Annotation<ContextoProduto>(),
  sugestao: Annotation<SugestaoRegra | null>({ reducer: (_, b) => b, default: () => null }),
  erros: Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
  iteracoes: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
});

const SYSTEM = `Você desenha compras coletivas de um marketplace B2B industrial de Manaus.
Compradores pequenos somam quantidade até destravar lotes de desconto progressivo;
quando a coletiva fecha, TODOS pagam o preço do melhor lote atingido.

Responda SOMENTE com JSON no formato:
{"meta_qtd":int,"prazo_dias":int,"min_participantes":int,"max_participantes":int|null,
 "lotes":[{"min_qtd":int,"valor_unitario":number}],"justificativa":"1-2 frases em pt-BR"}

Regras duras (o sistema rejeita e devolve para você corrigir):
- 2 a 4 lotes, quantidade crescente e preço estritamente decrescente;
- todo lote abaixo do preço base e nunca mais de 30% de desconto;
- meta_qtd >= quantidade do primeiro lote e <= estoque disponível;
- prazo entre 1 e 30 dias; min_participantes >= 2.
Calibre pela demanda real: a meta precisa ser alcançável pelo giro dos últimos 90 dias.`;

function modelo() {
  return new ChatAnthropic({
    model: "claude-haiku-4-5",
    temperature: 0.2,
    maxTokens: 1200,
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

function contextoTexto(ctx: ContextoProduto): string {
  return [
    `Produto: ${ctx.nome}`,
    `Preço base: R$ ${ctx.preco_base}`,
    `Estoque disponível: ${ctx.estoque_atual} un`,
    `Vendas 90 dias: ${ctx.unidades_vendidas_90d} un em ${ctx.pedidos_90d} pedidos`,
    `Quantidade média por pedido: ${ctx.qtd_media_por_pedido}`,
    ctx.coletivas_anteriores.length
      ? `Coletivas anteriores: ${ctx.coletivas_anteriores
          .map((c) => `meta ${c.meta_qtd}, alcançou ${c.qtd_atual}, ${c.status}`)
          .join("; ")}`
      : "Coletivas anteriores: nenhuma.",
  ].join("\n");
}

function extrairJson(texto: string): SugestaoRegra | null {
  const bruto = texto.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  const inicio = bruto.indexOf("{");
  const fim = bruto.lastIndexOf("}");
  if (inicio < 0 || fim <= inicio) return null;
  try {
    return JSON.parse(bruto.slice(inicio, fim + 1)) as SugestaoRegra;
  } catch {
    return null;
  }
}

export function construirGrafo() {
  return new StateGraph(State)
    .addNode("propor", async (s) => {
      const resposta = await modelo().invoke([
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: s.erros.length
            ? [
                contextoTexto(s.ctx),
                "",
                "Sua sugestão anterior foi rejeitada:",
                ...s.erros.map((e) => `- ${e}`),
                "",
                `Sugestão anterior: ${JSON.stringify(s.sugestao)}`,
                "Corrija e responda de novo só com o JSON.",
              ].join("\n")
            : contextoTexto(s.ctx),
        },
      ]);
      const texto =
        typeof resposta.content === "string"
          ? resposta.content
          : resposta.content
              .map((b) => ("text" in b ? (b.text as string) : ""))
              .join("");
      return { sugestao: extrairJson(texto), iteracoes: s.iteracoes + 1 };
    })
    .addNode("validar", (s) => ({ erros: validarSugestao(s.sugestao, s.ctx) }))
    .addEdge(START, "propor")
    .addEdge("propor", "validar")
    .addConditionalEdges("validar", (s) =>
      s.erros.length > 0 && s.iteracoes < MAX_ITER ? "propor" : END,
    )
    .compile();
}

export type ResultadoAgente = {
  ok: boolean;
  sugestao?: SugestaoRegra;
  erros?: string[];
  iteracoes?: number;
};

export async function sugerirRegra(ctx: ContextoProduto): Promise<ResultadoAgente> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, erros: ["IA não configurada: falta ANTHROPIC_API_KEY no ambiente."] };
  }
  const final = await construirGrafo().invoke({ ctx });
  if (final.erros.length > 0 || !final.sugestao) {
    return { ok: false, erros: final.erros, iteracoes: final.iteracoes };
  }
  return { ok: true, sugestao: final.sugestao, iteracoes: final.iteracoes };
}
