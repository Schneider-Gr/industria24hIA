// Simulador do avião (decisão da dona, 25/09/2026): o seller define o R$/km do
// produto e a quantidade mínima; o simulador mostra, para perto, médio e
// longe, o frete (km só ida × R$/km + porto + ajudantes), quanto ele pesa no
// pedido e a partir de quantas unidades a entrega fica viável.
// Sem peso nem veículo na conta: só km × R$/km.

export const LIMITE_IDEAL = 0.1; // até 10% do pedido: ótimo
export const LIMITE_VIAVEL = 0.2; // até 20%: viável; acima, inviável

export type Extras = { porto?: number; ajudantes?: number; valorAjudante?: number };
export type Faixa = "otimo" | "viavel" | "inviavel";

const r2 = (v: number) => Math.round(v * 100) / 100;

// Menor quantidade em que frete ÷ (preço × qtd) ≤ limite.
export function qtdParaPct(frete: number, preco: number, limite: number): number {
  return Math.max(1, Math.ceil(frete / (preco * limite) - 1e-9));
}

export function simularDestino({
  distanciaM,
  valorKm,
  preco,
  qtd,
  porto = 0,
  ajudantes = 0,
  valorAjudante = 0,
}: { distanciaM: number; valorKm: number; preco: number; qtd: number } & Extras) {
  const km = Math.round(distanciaM / 100) / 10; // só ida, a 0,1 km (PRD 053)
  const frete = r2(km * valorKm + Math.max(0, porto) + Math.max(0, ajudantes) * Math.max(0, valorAjudante));
  const pedido = r2(preco * qtd);
  const pct = r2(frete / pedido);
  const faixa: Faixa = frete <= pedido * LIMITE_IDEAL + 1e-9 ? "otimo" : frete <= pedido * LIMITE_VIAVEL + 1e-9 ? "viavel" : "inviavel";
  return {
    km,
    frete,
    pedido,
    pct,
    faixa,
    qtdViavel: qtdParaPct(frete, preco, LIMITE_VIAVEL),
    qtdIdeal: qtdParaPct(frete, preco, LIMITE_IDEAL),
  };
}
