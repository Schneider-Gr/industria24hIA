import Anthropic from "@anthropic-ai/sdk";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { buildSystemPrompt, PERSONAS, type Persona } from "./systemPrompt";

// Migrado de OpenAI (gpt-4o-mini) para Claude Haiku 4.5 em 11/09/2026: a
// conta da OpenAI ficou sem crédito e o erro subia como 500 sem corpo JSON,
// que o ChatWidget mostra como "Falha ao conectar. Tente novamente.".
// O formato de mensagem interno continua sendo o da OpenAI
// (ChatCompletionMessageParam) — atendimento.ts e botConversa.ts não mudam;
// a tradução para o wire format da Anthropic fica toda aqui.
const API_KEY = (process.env.ANTHROPIC_API_KEY ?? "").trim();
export const isBotConfigured = API_KEY.length > 0;

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 4096;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: API_KEY });
  return client;
}

// Ferramentas que o modelo pode chamar. A execução real (buscar pedido,
// gravar lead, abrir chamado) fica com quem chama chatComBot — este módulo
// só sabe descrever/pedir a chamada, nunca toca o banco.
const ETAPAS_FUNIL = [
  "persona_identificada",
  "em_atendimento",
  "resolvido_pelo_bot",
  "escalado_humano",
  "convertido",
  "descartado",
] as const;

export const BOT_TOOLS: Anthropic.Tool[] = [
  {
    name: "definir_persona",
    description: "Registra a persona identificada no início da conversa (chamar assim que a pessoa responder quem ela é).",
    input_schema: {
      type: "object",
      properties: { persona: { type: "string", enum: [...PERSONAS] } },
      required: ["persona"],
    },
  },
  {
    name: "consultar_prd",
    description:
      "Busca o PRD real do marketplace (Confluence) quando a dúvida exige detalhe de regra de negócio que o conhecimento geral não cobre com confiança.",
    input_schema: {
      type: "object",
      properties: { pergunta: { type: "string", description: "A dúvida específica a buscar no PRD." } },
      required: ["pergunta"],
    },
  },
  {
    name: "buscar_pedido",
    description:
      "Consulta o status e os itens (com id de cada item) de UM pedido específico do usuário logado. Use quando a pessoa já informou qual pedido.",
    input_schema: {
      type: "object",
      properties: { pedido_id: { type: "string", description: "ID ou número do pedido informado pelo usuário." } },
      required: ["pedido_id"],
    },
  },
  {
    name: "listar_pedidos",
    description:
      "Lista TODOS os pedidos do usuário logado (mais recentes primeiro), com status e código de retirada/entrega quando existir. Use quando a pessoa perguntar 'meus pedidos', 'status das minhas compras' ou não souber/informar qual pedido.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "buscar_disputas_pos_venda",
    description:
      "Lista as disputas de pós-venda (trocas/reembolsos) abertas pelo usuário logado, com motivo e status. Use para responder dúvidas sobre um caso já aberto.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "registrar_lead",
    description:
      "Registra um lead comercial (interesse de negócio) ou de escalonamento para humano, com persona e etapa do funil. " +
      "Omita `contato` se já for conhecido pelo canal (telefone do WhatsApp, e-mail de usuário logado) — o sistema " +
      "preenche sozinho; só inclua se a pessoa informou um contato novo/diferente na conversa.",
    input_schema: {
      type: "object",
      properties: {
        nome: { type: "string" },
        contato: { type: "string", description: "E-mail ou telefone/WhatsApp — só quando for novo, não repita o que o canal já sabe." },
        interesse: { type: "string" },
        etapa_funil: { type: "string", enum: [...ETAPAS_FUNIL] },
      },
      required: ["etapa_funil"],
    },
  },
  {
    name: "abrir_chamado",
    description: "Escala a conversa para um atendente humano quando o bot não sabe responder ou a pessoa pede humano.",
    input_schema: {
      type: "object",
      properties: { resumo: { type: "string", description: "Resumo do que o usuário precisa." } },
      required: ["resumo"],
    },
  },
];

// Formato OpenAI -> formato Anthropic. Três diferenças que importam:
// 1. resultado de tool é bloco `tool_result` dentro de uma mensagem `user`,
//    não um role "tool" próprio — e os resultados de uma mesma rodada têm
//    que ir juntos na MESMA mensagem (daí o agrupamento no consecutivo);
// 2. tool_call do assistant vira bloco `tool_use` com input já parseado;
// 3. a conversa precisa começar com `user`.
export function paraAnthropic(mensagens: ChatCompletionMessageParam[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];

  for (const m of mensagens) {
    if (m.role === "tool") {
      const bloco: Anthropic.ToolResultBlockParam = {
        type: "tool_result",
        tool_use_id: m.tool_call_id,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      };
      const ultimo = out[out.length - 1];
      if (ultimo?.role === "user" && Array.isArray(ultimo.content)) ultimo.content.push(bloco);
      else out.push({ role: "user", content: [bloco] });
      continue;
    }

    if (m.role === "assistant") {
      const blocos: Anthropic.ContentBlockParam[] = [];
      if (typeof m.content === "string" && m.content.trim()) blocos.push({ type: "text", text: m.content });
      for (const call of m.tool_calls ?? []) {
        if (call.type !== "function") continue;
        blocos.push({
          type: "tool_use",
          id: call.id,
          name: call.function.name,
          input: JSON.parse(call.function.arguments || "{}"),
        });
      }
      if (blocos.length) out.push({ role: "assistant", content: blocos });
      continue;
    }

    if (m.role === "user" && typeof m.content === "string" && m.content.trim()) {
      out.push({ role: "user", content: m.content });
    }
  }

  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

export type RespostaBot = {
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
};

export async function chatComBot(
  mensagens: ChatCompletionMessageParam[],
  opts: { persona: Persona | null; contextoExtra?: string },
): Promise<RespostaBot> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(opts.persona, opts.contextoExtra),
    tools: BOT_TOOLS,
    messages: paraAnthropic(mensagens),
  });

  const texto = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const toolCalls = res.content
    .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
    .map((b) => ({ id: b.id, type: "function" as const, function: { name: b.name, arguments: JSON.stringify(b.input) } }));

  return { content: texto || null, tool_calls: toolCalls.length ? toolCalls : undefined };
}

// Chamada simples sem tool-calling — usada pelo bot dentro do chat
// comprador↔loja (src/lib/ai/botConversa.ts) e pelo scoring de lead, que
// não precisam de nenhuma ferramenta do atendimento geral.
export async function chatLivre(systemPrompt: string, mensagens: ChatCompletionMessageParam[]): Promise<string> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: paraAnthropic(mensagens),
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
