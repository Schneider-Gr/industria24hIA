import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import type { Persona } from "./systemPrompt";

// Jev (TypeSafe System One) decide a persona na 1ª mensagem, antes do LLM.
// Sem isto, conversa sem persona gasta uma rodada inteira do chatComBot só
// para o modelo chamar definir_persona. Jev devolve escolha + confidence;
// abaixo do limiar a persona fica null e o fluxo antigo (definir_persona
// pelo LLM) segue igual — Jev só adianta, nunca bloqueia.
const API_KEY = (process.env.TYPESAFE_API_KEY ?? "").trim();
export const isJevConfigured = API_KEY.length > 0;

// ponytail: limiar chutado; calibrar com bot_conversas.persona reais antes de baixar.
export const LIMIAR_CONFIANCA_PERSONA = 0.8;

let client: TypeSafeClient | null = null;

const OPCOES = {
  consumidor: "Quer comprar um produto, acompanhar um pedido, trocar ou devolver algo que comprou.",
  seller: "É uma loja, indústria ou fornecedor que quer vender no marketplace ou gerencia a própria loja nele.",
  motorista: "É motorista ou entregador que quer fazer entregas ou tem dúvida sobre uma entrega que está fazendo.",
  afiliado: "Quer divulgar produtos e ganhar comissão como afiliado ou indicador.",
  indefinido: "A mensagem não deixa claro quem é a pessoa (saudação, pergunta genérica ou assunto fora das opções).",
} as const;

export async function classificarPersona(mensagem: string): Promise<Persona | null> {
  if (!isJevConfigured) return null;
  client ??= new TypeSafeClient({ apiKey: API_KEY });
  try {
    const { answers } = await client.systemOne({
      state: { mensagem },
      questions: {
        persona: choice(
          "Quem está escrevendo `mensagem` para o atendimento do marketplace industria24 (marketplace B2B/B2C de produtos industriais)?",
          OPCOES,
        ),
      },
    });
    return personaDaResposta(answers.persona.choice, answers.persona.confidence);
  } catch {
    // Best-effort: falha do Jev nunca derruba o atendimento.
    return null;
  }
}

export function personaDaResposta(escolha: keyof typeof OPCOES, confianca: number): Persona | null {
  if (escolha === "indefinido" || confianca < LIMIAR_CONFIANCA_PERSONA) return null;
  return escolha;
}
