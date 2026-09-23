// O bot fecha a resposta com uma linha `[OPCOES: A | B | C]` quando há próximos
// passos óbvios (regra FORMATO do systemPrompt). O canal decide como mostrar:
// botões no widget do site, botões (até 3) ou lista (até 10) no WhatsApp.
// Clicar numa opção envia o próprio rótulo como a próxima mensagem do usuário.
const LINHA_OPCOES = /\n?\s*\[OPCOES:([^\]]*)\]\s*$/i;
export const MAX_OPCOES = 10; // teto da lista interativa do WhatsApp
export const MAX_ROTULO = 24; // título de linha da lista do WhatsApp

// Rótulo longo corta na última palavra inteira: "Mudar forma de recebimen" confunde.
export function cortar(rotulo: string, max = MAX_ROTULO): string {
  if (rotulo.length <= max) return rotulo;
  const corte = rotulo.slice(0, max + 1).lastIndexOf(" ");
  return rotulo.slice(0, corte > 0 ? corte : max);
}

export function extrairOpcoes(resposta: string): { texto: string; opcoes: string[] } {
  const m = resposta.match(LINHA_OPCOES);
  if (!m) return { texto: resposta.trim(), opcoes: [] };
  const opcoes = [...new Set(m[1].split("|").map((o) => cortar(o.trim())).filter(Boolean))].slice(0, MAX_OPCOES);
  return { texto: resposta.slice(0, m.index).trim(), opcoes };
}
