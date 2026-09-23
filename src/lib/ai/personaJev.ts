import { consultarJev } from "../catalogo-compra/jev-taxonomia";
import { PERSONAS, type Persona } from "./systemPrompt";

// #744: a persona sai da própria mensagem pelo Jev, antes do Claude. Sem isso o
// bot sempre gastava um turno perguntando "quem é você?", e em produção 7
// conversas com a persona dita na 1ª mensagem ficaram sem persona (o Claude não
// chamou definir_persona). "indefinido" existe para "oi" não virar chute.
export const PERGUNTA_PERSONA_JEV = {
  type: "choice" as const,
  instructions: "Quem está escrevendo a `mensagem` para o atendimento do marketplace industrial Indústria 24h?",
  criteria: {
    consumidor: "Comprador: quer comprar, acompanhar pedido, trocar ou devolver produto.",
    seller: "Lojista, fábrica ou indústria que vende ou quer vender produtos na plataforma.",
    motorista: "Entregador ou motorista que faz ou quer fazer entregas.",
    afiliado: "Afiliado que indica vendas e recebe comissão, ou quer ser afiliado.",
    indefinido: "Saudação ou mensagem sem pista de quem é a pessoa.",
  } satisfies Record<Persona | "indefinido", string>,
};

// Eval de 23/09 com 19 mensagens reais (jev-1.13.0): acertos em 1,00; o único
// chute errado ("compra futura" → consumidor) veio com 0,64. Errar a persona
// troca o prompt e as ferramentas do bot, por isso o limiar é alto.
export const CONFIANCA_PERSONA = 0.9;
// O cliente retenta até ~32s no pior caso; num turno de chat, melhor perguntar.
const PRAZO_MS = 3_000;

/** Persona pelo Jev; null sem chave, em erro, lento, ambíguo ou abaixo do limiar (o bot pergunta). */
export async function personaJev(mensagem: string): Promise<Persona | null> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey || !mensagem.trim()) return null;
  try {
    const r = await Promise.race([
      consultarJev(apiKey, { mensagem: mensagem.slice(0, 2_000) }, { persona: PERGUNTA_PERSONA_JEV }),
      new Promise<null>((ok) => setTimeout(ok, PRAZO_MS, null)),
    ]);
    const a = r?.persona;
    if (!a || !(a.confidence >= CONFIANCA_PERSONA)) return null;
    const [escolha] = Object.entries(a.probabilities).sort((x, y) => y[1] - x[1])[0];
    return PERSONAS.includes(escolha as Persona) ? (escolha as Persona) : null;
  } catch (e) {
    console.error("[jev-persona]", e);
    return null;
  }
}
