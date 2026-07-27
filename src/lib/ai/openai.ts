import OpenAI from "openai";

export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export function getOpenAIClient() {
  const apiKey = process.env.openai;
  if (!apiKey) {
    throw new Error(
      "Env var 'openai' não configurada. Defina em web/.env.local para usar sugestões por IA.",
    );
  }
  return new OpenAI({ apiKey });
}
