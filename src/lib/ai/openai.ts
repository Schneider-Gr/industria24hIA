import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { buildSystemPrompt, PERSONAS, type Persona } from "./systemPrompt";

// A integração Vercel registrou a chave com o nome "openai"; aceitar ambos.
const API_KEY = (process.env.OPENAI_API_KEY ?? process.env.openai ?? "").trim();
export const isOpenAiConfigured = API_KEY.length > 0;

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: API_KEY });
  return client;
}

// Ferramentas que o modelo pode chamar. A execução real (buscar pedido,
// gravar lead, abrir chamado) fica com quem chama chatComBot — o cliente
// OpenAI só sabe descrever/pedir a chamada, nunca toca o banco.
const ETAPAS_FUNIL = [
  "persona_identificada",
  "em_atendimento",
  "resolvido_pelo_bot",
  "escalado_humano",
  "convertido",
  "descartado",
] as const;

export const BOT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "definir_persona",
      description: "Registra a persona identificada no início da conversa (chamar assim que a pessoa responder quem ela é).",
      parameters: {
        type: "object",
        properties: {
          persona: { type: "string", enum: [...PERSONAS] },
        },
        required: ["persona"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_prd",
      description:
        "Busca o PRD real do marketplace (Confluence) quando a dúvida exige detalhe de regra de negócio que o conhecimento geral não cobre com confiança.",
      parameters: {
        type: "object",
        properties: {
          pergunta: { type: "string", description: "A dúvida específica a buscar no PRD." },
        },
        required: ["pergunta"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_pedido",
      description:
        "Consulta o status e os itens (com id de cada item) de UM pedido específico do usuário logado. Use quando a pessoa já informou qual pedido.",
      parameters: {
        type: "object",
        properties: {
          pedido_id: { type: "string", description: "ID ou número do pedido informado pelo usuário." },
        },
        required: ["pedido_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_pedidos",
      description:
        "Lista TODOS os pedidos do usuário logado (mais recentes primeiro), com status e código de retirada/entrega quando existir. Use quando a pessoa perguntar 'meus pedidos', 'status das minhas compras' ou não souber/informar qual pedido.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_disputas_pos_venda",
      description:
        "Lista as disputas de pós-venda (trocas/reembolsos) abertas pelo usuário logado, com motivo e status. Use para responder dúvidas sobre um caso já aberto.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "registrar_lead",
      description:
        "Registra um lead comercial (interesse de negócio) ou de escalonamento para humano, com persona e etapa do funil. " +
        "Omita `contato` se já for conhecido pelo canal (telefone do WhatsApp, e-mail de usuário logado) — o sistema " +
        "preenche sozinho; só inclua se a pessoa informou um contato novo/diferente na conversa.",
      parameters: {
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
  },
  {
    type: "function",
    function: {
      name: "abrir_chamado",
      description: "Escala a conversa para um atendente humano quando o bot não sabe responder ou a pessoa pede humano.",
      parameters: {
        type: "object",
        properties: {
          resumo: { type: "string", description: "Resumo do que o usuário precisa." },
        },
        required: ["resumo"],
      },
    },
  },
];

export async function chatComBot(
  mensagens: ChatCompletionMessageParam[],
  opts: { persona: Persona | null; contextoExtra?: string },
) {
  const res = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: buildSystemPrompt(opts.persona, opts.contextoExtra) }, ...mensagens],
    tools: BOT_TOOLS,
  });
  return res.choices[0].message;
}

// Chamada simples sem tool-calling — usada pelo bot dentro do chat
// comprador↔loja (src/lib/ai/botConversa.ts), que não precisa de nenhuma
// ferramenta do atendimento geral, só responder com base no histórico.
export async function chatLivre(systemPrompt: string, mensagens: ChatCompletionMessageParam[]): Promise<string> {
  const res = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: systemPrompt }, ...mensagens],
  });
  return res.choices[0].message.content ?? "";
}
