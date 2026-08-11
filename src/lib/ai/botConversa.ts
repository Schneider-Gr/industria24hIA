import { chatLivre, isOpenAiConfigured } from "./openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const MARCADOR_HANDOFF = "[HANDOFF]";

// Prefixo fixo que a mensagem do bot leva na thread para o comprador
// entender que não é a loja respondendo — decisão de produto: "sempre
// responde primeiro" só funciona sem confundir se ficar claro quem fala.
export const PREFIXO_BOT = "🤖 Assistente automático da loja:";

export type ContextoPedido = {
  compradorNome?: string | null;
  produtoNome?: string | null;
  perecivel?: boolean;
  disputaAberta?: { motivo: string; status: string } | null;
};

function systemPrompt(nomeLoja: string, contexto: ContextoPedido = {}): string {
  const linhasContexto = [
    `- Comprador: ${contexto.compradorNome ?? "não identificado"}`,
    contexto.produtoNome
      ? `- Produto: ${contexto.produtoNome}${contexto.perecivel ? " (produto PERECÍVEL — regras abaixo)" : ""}`
      : null,
    contexto.disputaAberta
      ? `- Já existe uma disputa aberta para este pedido (motivo: ${contexto.disputaAberta.motivo}, status: ${contexto.disputaAberta.status}) — não abra outra, oriente o comprador a acompanhar por lá.`
      : null,
  ].filter(Boolean);

  return `
Você é o assistente automático que responde em nome da loja "${nomeLoja}" no
marketplace industria24.com.br, enquanto a loja não assume a conversa
pessoalmente. Responda em português, direto e educado, só com base no que já
foi dito nesta conversa — nunca invente preço, prazo, estoque ou política que
não está no histórico.

Você NÃO tem acesso a dados do pedido, estoque ou sistema além do que está
listado em CONTEXTO DESTA CONVERSA abaixo — se o comprador perguntar algo que
dependa de mais do que isso (status exato de entrega, disponibilidade real,
valores), diga que vai confirmar com a loja em vez de adivinhar.

CONTEXTO DESTA CONVERSA:
${linhasContexto.join("\n")}

REGRAS DE TROCA/DEVOLUÇÃO (vigentes, PRD 009/010):
- Janela padrão: 7 dias corridos após confirmação de entrega para abrir disputa.
- Produto PERECÍVEL: janela reduzida a 24h após entrega, com foto obrigatória — não aceite reclamação de perecível fora desse prazo.
- Você NÃO abre disputa nem promete reembolso/troca — só orienta o comprador a usar o botão "Abrir disputa" no pedido dele, ou informa o status se já houver uma (ver CONTEXTO acima).
- Um modelo de janelas por token de confirmação (48h/0-7d/7-30d/30d+) descrito em documento interno é uma PROPOSTA ainda não implementada — não cite prazos desse modelo como se fossem vigentes.

ENCERRAR E CHAMAR A LOJA:
Se depois de tentar ajudar 2 vezes com a MESMA dúvida você não conseguir
resolver, OU o comprador pedir explicitamente para falar com a loja ou um
humano, responda começando EXATAMENTE com "${MARCADOR_HANDOFF}" seguido de
uma frase curta avisando que vai chamar a loja. Não continue tentando depois
disso.
`.trim();
}

export type RespostaBotConversa = { resposta: string; handoff: boolean };

// Bot "sempre responde primeiro" no chat comprador↔loja (conversas/
// mensagens) — decisão de produto do dono: substitui a loja até ela
// responder manualmente (o que desativa o bot naquela conversa, ver
// enviarMensagem em src/app/mensagens/actions.ts) ou até o próprio bot
// decidir escalar. Sem tool-calling — diferente do bot de atendimento
// geral (src/lib/ai/atendimento.ts), aqui não há pedido/disputa para
// consultar, só a conversa em si.
export async function responderBotConversa(
  nomeLoja: string,
  historico: { autor: "comprador" | "bot"; corpo: string }[],
  contexto: ContextoPedido = {},
): Promise<RespostaBotConversa> {
  if (!isOpenAiConfigured) {
    return { resposta: "", handoff: true };
  }

  const mensagens: ChatCompletionMessageParam[] = historico.map((m) => ({
    role: m.autor === "comprador" ? "user" : "assistant",
    content: m.corpo,
  }));

  const texto = await chatLivre(systemPrompt(nomeLoja, contexto), mensagens);
  if (texto.startsWith(MARCADOR_HANDOFF)) {
    return { resposta: texto.slice(MARCADOR_HANDOFF.length).trim(), handoff: true };
  }
  return { resposta: texto, handoff: false };
}
