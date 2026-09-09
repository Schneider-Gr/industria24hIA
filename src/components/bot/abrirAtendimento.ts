import type { Persona } from "@/lib/ai/systemPrompt";

// O widget de atendimento é montado uma vez no layout raiz e qualquer página
// pode chamá-lo. Um CustomEvent no window evita ter que subir o estado do
// chat para um provider global só porque a LP de captação (#542) precisa
// abrir a conversa — quem dispara não conhece o widget, e o widget não
// conhece a página.
export const EVENTO_ABRIR_ATENDIMENTO = "industria24:abrir-atendimento";

export type DetalheAbrirAtendimento = {
  /** Semeia a persona da conversa quando a origem do clique já a revela. */
  persona?: Persona;
  /** Primeira mensagem enviada em nome do visitante, para o bot já entrar no assunto. */
  mensagem?: string;
};

export function abrirAtendimento(detalhe: DetalheAbrirAtendimento = {}): void {
  window.dispatchEvent(new CustomEvent<DetalheAbrirAtendimento>(EVENTO_ABRIR_ATENDIMENTO, { detail: detalhe }));
}
