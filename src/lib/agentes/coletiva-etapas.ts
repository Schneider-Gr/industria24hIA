// Agente que POPULA AS ETAPAS da coletiva: varre as coletivas em andamento,
// fecha/expira o que já venceu (é o que substitui um cron), emite os eventos
// de progresso e escreve o recado do agente no mural dos participantes.
//
// Grafo LangGraph:
//   START → carregar(banco) → avaliar(determinístico) → redigir(LLM) → publicar(banco) → END
//
// Os NÚMEROS de toda mensagem saem do nó determinístico; o LLM só escolhe as
// palavras. Sem ANTHROPIC_API_KEY o nó de redação cai num texto fixo e o resto
// do fluxo (fechamento, eventos, notificação) segue funcionando.

import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";
import { createServiceClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { precoLote, proximoLote, economiaPorUnidade, type Lote } from "@/lib/coletiva";

type ColetivaEmAndamento = {
  id: string;
  produto_id: string;
  qtd_atual: number;
  meta_qtd: number;
  preco_base: number;
  prazo: string;
  status: string;
  lotes: Lote[];
};

export type Avaliacao = {
  coletiva_id: string;
  fechou: boolean;
  status: string;
  preco_atual: number;
  falta_para_proximo: number | null;
  preco_proximo: number | null;
  economia_extra: number | null;
  horas_para_prazo: number;
  recado: string | null;
};

type Db = SupabaseClient<Database>;

const State = Annotation.Root({
  coletivas: Annotation<ColetivaEmAndamento[]>({ reducer: (_, b) => b, default: () => [] }),
  avaliacoes: Annotation<Avaliacao[]>({ reducer: (_, b) => b, default: () => [] }),
});

function modelo() {
  return new ChatAnthropic({
    model: "claude-haiku-4-5",
    temperature: 0.4,
    maxTokens: 400,
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

export function construirGrafoEtapas(db: Db) {
  return new StateGraph(State)
    // ---------- carregar ----------
    .addNode("carregar", async () => {
      const { data } = await db
        .from("compras_coletivas")
        .select("id, produto_id, qtd_atual, meta_qtd, preco_base, prazo, status, lotes")
        .in("status", ["Aberta", "Viavel"]);
      return { coletivas: (data ?? []) as ColetivaEmAndamento[] };
    })
    // ---------- avaliar (determinístico + fechamento) ----------
    .addNode("avaliar", async (s) => {
      const agora = Date.now();
      const avaliacoes: Avaliacao[] = [];

      for (const c of s.coletivas) {
        // coletiva_fechar é idempotente: decide entre seguir, expirar e fechar.
        const { data: fecho } = await db.rpc("coletiva_fechar", {
          p_coletiva_id: c.id,
          p_forcar: false,
        });
        const resultado = (fecho ?? {}) as { status?: string; fechou?: boolean };

        const lotes = Array.isArray(c.lotes) ? c.lotes : [];
        const atual = precoLote(lotes, c.qtd_atual, Number(c.preco_base));
        const proximo = proximoLote(lotes, c.qtd_atual);
        const horas = Math.round((new Date(c.prazo).getTime() - agora) / 3_600_000);

        avaliacoes.push({
          coletiva_id: c.id,
          fechou: resultado.fechou === true,
          status: resultado.status ?? c.status,
          preco_atual: atual,
          falta_para_proximo: proximo ? proximo.min_qtd - c.qtd_atual : null,
          preco_proximo: proximo ? proximo.valor_unitario : null,
          economia_extra: proximo ? economiaPorUnidade(atual, proximo.valor_unitario) : null,
          horas_para_prazo: horas,
          recado: null,
        });

        // Aviso de prazo curto: um por coletiva (marco garante a unicidade).
        if (!resultado.fechou && horas > 0 && horas <= 24) {
          await db.rpc("coletiva_evento", {
            p_coletiva_id: c.id,
            p_tipo: "prazo_proximo",
            p_payload: { marco: "24h", horas, qtd_atual: c.qtd_atual },
          });
        }
      }
      return { avaliacoes };
    })
    // ---------- redigir (LLM, só as palavras) ----------
    .addNode("redigir", async (s) => {
      const pendentes = s.avaliacoes.filter(
        (a) => !a.fechou && a.falta_para_proximo != null && a.falta_para_proximo > 0,
      );
      if (pendentes.length === 0) return { avaliacoes: s.avaliacoes };

      if (!process.env.ANTHROPIC_API_KEY) {
        return {
          avaliacoes: s.avaliacoes.map((a) =>
            pendentes.includes(a)
              ? {
                  ...a,
                  recado: `Faltam ${a.falta_para_proximo} un para o lote de R$ ${a.preco_proximo} — economia extra de R$ ${a.economia_extra} por unidade.`,
                }
              : a,
          ),
        };
      }

      const resposta = await modelo().invoke([
        {
          role: "system",
          content:
            "Você escreve recados curtos (1 frase, pt-BR, tom direto de marketplace B2B) no mural de compras coletivas. " +
            "Use EXATAMENTE os números informados, sem inventar nem arredondar. " +
            "Responda um JSON: {\"recados\":[{\"coletiva_id\":\"...\",\"texto\":\"...\"}]}.",
        },
        {
          role: "user",
          content: pendentes
            .map(
              (a) =>
                `coletiva_id=${a.coletiva_id}: faltam ${a.falta_para_proximo} un para o lote de R$ ${a.preco_proximo}/un (hoje R$ ${a.preco_atual}/un, economia extra R$ ${a.economia_extra}/un); prazo em ${a.horas_para_prazo}h.`,
            )
            .join("\n"),
        },
      ]);

      const texto =
        typeof resposta.content === "string"
          ? resposta.content
          : resposta.content.map((b) => ("text" in b ? (b.text as string) : "")).join("");
      let recados: { coletiva_id: string; texto: string }[] = [];
      try {
        const inicio = texto.indexOf("{");
        const fim = texto.lastIndexOf("}");
        recados = JSON.parse(texto.slice(inicio, fim + 1)).recados ?? [];
      } catch {
        recados = [];
      }

      return {
        avaliacoes: s.avaliacoes.map((a) => {
          const r = recados.find((x) => x.coletiva_id === a.coletiva_id);
          if (r?.texto) return { ...a, recado: r.texto };
          if (pendentes.includes(a)) {
            return {
              ...a,
              recado: `Faltam ${a.falta_para_proximo} un para o lote de R$ ${a.preco_proximo} — economia extra de R$ ${a.economia_extra} por unidade.`,
            };
          }
          return a;
        }),
      };
    })
    // ---------- publicar ----------
    .addNode("publicar", async (s) => {
      for (const a of s.avaliacoes) {
        if (!a.recado) continue;
        await db.rpc("coletiva_evento", {
          p_coletiva_id: a.coletiva_id,
          p_tipo: "agente",
          p_payload: {
            marco: `falta-${a.falta_para_proximo}`,
            texto: a.recado,
            preco_atual: a.preco_atual,
            preco_proximo: a.preco_proximo,
          },
        });
      }
      return {};
    })
    .addEdge(START, "carregar")
    .addEdge("carregar", "avaliar")
    .addEdge("avaliar", "redigir")
    .addEdge("redigir", "publicar")
    .addEdge("publicar", END)
    .compile();
}

// Varre as coletivas já fechadas cuja janela de pagamento venceu e cancela os
// inadimplentes (migration 0080), devolvendo o estoque. É o gatilho automático
// da alavanca — o seller também pode acionar na mão em /seller/coletivas.
async function expirarPagamentosVencidos(db: Db): Promise<{ coletivas: number; cancelados: number }> {
  const { data } = await db
    .from("compras_coletivas")
    .select("id")
    .eq("status", "Atingida")
    .not("pagamento_ate", "is", null)
    .lt("pagamento_ate", new Date().toISOString());

  let cancelados = 0;
  for (const c of (data ?? []) as { id: string }[]) {
    const { data: r } = await db.rpc("coletiva_expirar_pagamentos", { p_coletiva_id: c.id });
    cancelados += Number((r as { cancelados?: number } | null)?.cancelados ?? 0);
  }
  return { coletivas: (data ?? []).length, cancelados };
}

export async function rodarEtapas(): Promise<{
  avaliadas: number;
  fechadas: number;
  pagamentos_cancelados: number;
  avaliacoes: Avaliacao[];
}> {
  const db = createServiceClient();
  const final = await construirGrafoEtapas(db).invoke({});
  const avaliacoes = final.avaliacoes as Avaliacao[];
  const expiracao = await expirarPagamentosVencidos(db);
  return {
    avaliadas: avaliacoes.length,
    fechadas: avaliacoes.filter((a) => a.fechou).length,
    pagamentos_cancelados: expiracao.cancelados,
    avaliacoes,
  };
}
