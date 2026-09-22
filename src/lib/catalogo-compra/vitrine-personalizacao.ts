// Vitrine sortida + último comportamento de busca (18/09/2026).
//
// Consentimento (LGPD): o histórico de busca é cookie de personalização, não
// essencial. Só é gravado quando o comprador aceita "todos" no aviso de
// cookies; "essenciais" ou sem resposta = nada é gravado. Detalhes para o
// comprador em /privacidade/cookies.

export const CONSENTIMENTO_COOKIE = "consent_cookies";
export const HISTORICO_BUSCA_COOKIE = "hist_busca";
export const MAX_TERMOS = 5;
/** 90 dias: prazo declarado em /privacidade/cookies. */
export const HISTORICO_MAX_AGE = 60 * 60 * 24 * 90;

export type Consentimento = "todos" | "essenciais";

/**
 * Intercala as lojas (round-robin): cada rodada pega o próximo item de cada
 * loja, na ordem em que elas aparecem. Nada é descartado; a loja com mais
 * produtos só vai para o fim do trilho. Determinístico de propósito: sortear a
 * cada visita quebraria o cache da home.
 */
export function sortirPorLoja<T>(itens: T[], lojaDe: (item: T) => string): T[] {
  const filas = new Map<string, T[]>();
  for (const item of itens) {
    const loja = lojaDe(item);
    filas.set(loja, [...(filas.get(loja) ?? []), item]);
  }
  const saida: T[] = [];
  for (let rodada = 0; saida.length < itens.length; rodada++) {
    for (const fila of filas.values()) if (rodada < fila.length) saida.push(fila[rodada]);
  }
  return saida;
}

/** Termo mais recente primeiro, sem repetição (case-insensitive), no máximo MAX_TERMOS. */
export function registrarTermo(historico: string[], termo: string): string[] {
  const t = termo.trim().slice(0, 60);
  if (t.length < 2) return historico;
  return [t, ...historico.filter((h) => h.toLowerCase() !== t.toLowerCase())].slice(0, MAX_TERMOS);
}

export function lerHistorico(valor: string | undefined): string[] {
  if (!valor) return [];
  try {
    const lista = JSON.parse(decodeURIComponent(valor));
    return Array.isArray(lista) ? lista.filter((t): t is string => typeof t === "string").slice(0, MAX_TERMOS) : [];
  } catch {
    return [];
  }
}
