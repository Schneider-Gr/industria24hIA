import { distanciaKm, type Coordenada } from "../geo";

// Parte pura da ordenação por proximidade (PRD 030, fase 3): sem rede, sem
// Supabase, sem `server-only` — é o que o teste consegue exercitar. O I/O fica
// em ./proximidade.ts.

export type OrigemProduto = { cep: string | null; raioKm: number | null };

/** Peso de ordenação: distância em km, ou Infinity para "não sei onde está" e
 *  para quem declarou raio menor que a distância até o comprador. Infinity vai
 *  para o fim da lista — nunca some dela. */
export function pesoDeProximidade(
  origem: OrigemProduto | undefined,
  coordenadas: Map<string, Coordenada>,
  destino: Coordenada,
): number {
  if (!origem?.cep) return Infinity;
  const partida = coordenadas.get(origem.cep);
  if (!partida) return Infinity;

  const km = distanciaKm(partida, destino);
  if (origem.raioKm != null && km > origem.raioKm) return Infinity;
  return km;
}

/** Ordena preservando a ordem original em qualquer empate (sort estável desde
 *  ES2019), inclusive dentro do bloco Infinity. */
export function ordenarPorPesos<T extends { id: string }>(
  itens: T[],
  origens: Map<string, OrigemProduto>,
  coordenadas: Map<string, Coordenada>,
  destino: Coordenada,
): T[] {
  const pesos = new Map<string, number>();
  for (const item of itens) {
    pesos.set(item.id, pesoDeProximidade(origens.get(item.id), coordenadas, destino));
  }
  return [...itens].sort((a, b) => (pesos.get(a.id) ?? Infinity) - (pesos.get(b.id) ?? Infinity));
}
