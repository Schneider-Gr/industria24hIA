import { Client } from "@langchain/langgraph-sdk";

// Agente "Curadoria de vendedor" hospedado no Fleet (LangSmith/LangGraph
// Platform) -- ver docs/prds/008-curadoria-automatica-onboarding-sellers.md.
// Ele nunca recebe credencial de banco: quem calcula os fatos determinísticos
// (campo ausente/inválido) e busca os dados do cadastro é sempre o web/, aqui
// perto do Supabase. O Fleet só recebe texto já pronto e devolve texto --
// julgamento de qualidade de descrição, reescrita, rascunho de recado.
const API_URL =
  "https://prod-deepagents-agent-build-d4c1479ed8ce53fbb8c3eefc91f0aa7d.us.langgraph.app";
const ASSISTANT_ID = "bcaec661-e11b-4c75-8efd-a112095ad2b8";

// A integração Vercel registrou a chave como "LANG_CHAIN_API_KEY" -- aceitar
// ambos os nomes evita repetir o mesmo bug de mismatch já visto com Asaas
// (ASAAS_API_KEY vs ASASS_API_KEY) e OpenAI ("OPENAI_API_KEY" vs "openai").
const API_KEY = (process.env.LANGSMITH_API_KEY ?? process.env.LANG_CHAIN_API_KEY ?? "").trim();
export const isCuradoriaFleetConfigured = API_KEY.length > 0;

let client: Client | null = null;
function getClient(): Client {
  if (!client) {
    client = new Client({
      apiUrl: API_URL,
      apiKey: API_KEY,
      defaultHeaders: { "X-Auth-Scheme": "langsmith-api-key" },
    });
  }
  return client;
}

export type ParecerFleetResult = { ok: true; texto: string } | { ok: false; error: string };

// Manda uma mensagem de usuário pro agente e espera a resposta final (sem
// streaming -- a rotina de curadoria roda em lote, não precisa de tokens
// incrementais). `mensagem` já deve trazer os fatos calculados em código
// (campos ausentes, dados do produto); o agente só julga/redige texto.
export async function pedirParecerFleet(mensagem: string): Promise<ParecerFleetResult> {
  if (!isCuradoriaFleetConfigured) {
    return { ok: false, error: "Curadoria via Fleet não configurada: falta LANGSMITH_API_KEY." };
  }

  try {
    const values = await getClient().runs.wait(null, ASSISTANT_ID, {
      input: { messages: [{ role: "user", content: mensagem }] },
    });
    const messages = (values as { messages?: { type?: string; content?: unknown }[] }).messages ?? [];
    const ultima = messages.at(-1);
    const texto =
      typeof ultima?.content === "string"
        ? ultima.content
        : Array.isArray(ultima?.content)
          ? (ultima.content as { type?: string; text?: string }[])
              .filter((b) => b.type === "text")
              .map((b) => b.text ?? "")
              .join("")
          : "";
    if (!texto) return { ok: false, error: "Agente não retornou texto." };
    return { ok: true, texto };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao chamar o agente." };
  }
}
