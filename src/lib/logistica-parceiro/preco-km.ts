// Preço da entrega por km do afiliado logístico (PRD 053).
//
// O Bubble rotula "Valor por Km", mas o número de lá é a porcentagem do
// afiliado sobre a venda. Aqui é km de verdade: distância da Routes API ×
// R$/km do produto. Só ida (decisão 5), km arredondado a 0,1.

// ponytail: piso padrão fixo. O piso por loja (US05) entra como coluna
// quando o admin puder editá-lo; até lá quem chama passa pisoKm ou fica o padrão.
export const PISO_KM_PADRAO = 6;

export type EntradaPrecoKm = {
  distanciaM: number;
  valorKm: number;
  pisoKm?: number;
  /** Taxa de porto ou balsa (R$), somada ao frete. */
  taxaPorto?: number;
  /** Custo do ajudante (R$), quando a entrega precisa de um. */
  custoAjudante?: number;
};

export type PrecoKm = { ok: true; kmCobrados: number; freteKm: number; preco: number } | { ok: false; piso: number };

const centavos = (v: number) => Math.round(v * 100) / 100;
const extra = (v?: number) => (v && v > 0 ? v : 0);

export function precoPorKm({ distanciaM, valorKm, pisoKm = PISO_KM_PADRAO, taxaPorto, custoAjudante }: EntradaPrecoKm): PrecoKm {
  if (valorKm < pisoKm) return { ok: false, piso: pisoKm };
  const kmCobrados = Math.round(distanciaM / 100) / 10;
  const freteKm = centavos(kmCobrados * valorKm);
  return { ok: true, kmCobrados, freteKm, preco: centavos(freteKm + extra(taxaPorto) + extra(custoAjudante)) };
}
