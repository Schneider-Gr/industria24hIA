import { chatLivre, isOpenAiConfigured } from "./openai";
import type { ServiceClient } from "./botDb";

// Throttle: scoring é caro (chamada de IA) e a conversa pode gerar várias
// mensagens em minutos. Só re-pontua se a última pontuação tem mais de 1h
// ou nunca aconteceu — nunca por mensagem (issue #141, ponto revisado).
const THROTTLE_MS = 60 * 60 * 1000;

export const SCORES = ["quente", "morno", "frio"] as const;
export type Score = (typeof SCORES)[number];

const SYSTEM_PROMPT =
  "Você analisa uma conversa de atendimento comercial e responde SOMENTE com um JSON " +
  '{"score":"quente"|"morno"|"frio","resumo":"..."} — score reflete intenção de compra ' +
  "(quente = pronto para negociar/comprar, morno = interesse real mas sem urgência, " +
  "frio = curiosidade/sem sinal de compra); resumo tem no máximo 2 frases em português.";

/** Extrai {score, resumo} da resposta do modelo. Retorna null se não vier no formato esperado. */
export function parseScoreResponse(raw: string): { score: Score; resumo: string } | null {
  let parsed: unknown;
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { score, resumo } = parsed as Record<string, unknown>;
  if (typeof score !== "string" || !SCORES.includes(score as Score)) return null;
  if (typeof resumo !== "string" || resumo.trim().length === 0) return null;
  return { score: score as Score, resumo: resumo.trim() };
}

interface LeadParaPontuar {
  id: string;
  conversa_id: string | null;
  scored_at: string | null;
}
interface ClientDePontuacao {
  from(table: "leads"): {
    select(cols: string): {
      eq(col: "id", val: string): { maybeSingle(): Promise<{ data: LeadParaPontuar | null }> };
    };
    update(values: { score: Score; resumo_ia: string; scored_at: string }): {
      eq(col: "id", val: string): Promise<{ error: { message: string } | null }>;
    };
  };
  from(table: "bot_mensagens"): {
    select(cols: string): {
      eq(col: "conversa_id", val: string): {
        order(col: string, opts: { ascending: boolean }): { limit(n: number): Promise<{ data: { remetente: string; conteudo: string }[] | null }> };
      };
    };
  };
}

// ponytail: gatilho é o chamador (após registrar_lead), não um cron —
// upgrade para reprocessamento em lote se o volume de leads pedir.
export async function pontuarLead(svc: ServiceClient, leadId: string): Promise<void> {
  if (!isOpenAiConfigured) return;
  const client = svc as unknown as ClientDePontuacao;

  const { data: lead } = await client.from("leads").select("id, conversa_id, scored_at").eq("id", leadId).maybeSingle();
  if (!lead?.conversa_id) return;
  if (lead.scored_at && Date.now() - new Date(lead.scored_at).getTime() < THROTTLE_MS) return;

  const { data: mensagens } = await client
    .from("bot_mensagens")
    .select("remetente, conteudo")
    .eq("conversa_id", lead.conversa_id)
    .order("created_at", { ascending: true })
    .limit(30);
  if (!mensagens?.length) return;

  const transcricao = mensagens.map((m) => `${m.remetente === "usuario" ? "Cliente" : "Bot"}: ${m.conteudo}`).join("\n");
  const resposta = await chatLivre(SYSTEM_PROMPT, [{ role: "user", content: transcricao }]);
  const parsed = parseScoreResponse(resposta);
  if (!parsed) return;

  await client.from("leads").update({ score: parsed.score, resumo_ia: parsed.resumo, scored_at: new Date().toISOString() }).eq("id", leadId);
}
