import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { SYSTEM_PROMPT } from "./systemPrompt";

const API_KEY = (process.env.OPENAI_API_KEY ?? "").trim();
export const isOpenAiConfigured = API_KEY.length > 0;

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: API_KEY });
  return client;
}

// Ferramentas que o modelo pode chamar. A execução real (buscar pedido,
// gravar lead, abrir chamado) fica com quem chama chatComBot — o cliente
// OpenAI só sabe descrever/pedir a chamada, nunca toca o banco.
export const BOT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "buscar_pedido",
      description: "Consulta o status e os itens de um pedido do usuário logado que está conversando.",
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
      name: "registrar_lead",
      description: "Registra um lead comercial de visitante anônimo interessado em vender ou comprar.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string" },
          contato: { type: "string", description: "E-mail ou telefone." },
          interesse: { type: "string" },
        },
        required: ["contato"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "abrir_chamado",
      description: "Escala a conversa para um atendente humano quando o bot não sabe responder.",
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

export async function chatComBot(mensagens: ChatCompletionMessageParam[]) {
  const res = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...mensagens],
    tools: BOT_TOOLS,
  });
  return res.choices[0].message;
}
