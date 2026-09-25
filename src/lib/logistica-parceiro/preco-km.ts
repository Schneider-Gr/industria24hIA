// Preço da entrega por km do afiliado logístico (PRD 053).
//
// O Bubble rotula "Valor por Km", mas o número de lá é a porcentagem do
// afiliado sobre a venda. Aqui é km de verdade: distância da Routes API ×
// R$/km do produto. Só ida (decisão 5), km arredondado a 0,1.

// ponytail: piso padrão fixo. O piso por loja (US05) entra como coluna
// quando o admin puder editá-lo; até lá quem chama passa pisoKm ou fica o padrão.
export const PISO_KM_PADRAO = 6;

export type EntradaPrecoKm = { distanciaM: number; valorKm: number; pisoKm?: number };

export type PrecoKm = { ok: true; kmCobrados: number; preco: number } | { ok: false; piso: number };

export function precoPorKm({ distanciaM, valorKm, pisoKm = PISO_KM_PADRAO }: EntradaPrecoKm): PrecoKm {
  if (valorKm < pisoKm) return { ok: false, piso: pisoKm };
  const kmCobrados = Math.round(distanciaM / 100) / 10;
  return { ok: true, kmCobrados, preco: Math.round(kmCobrados * valorKm * 100) / 100 };
}
