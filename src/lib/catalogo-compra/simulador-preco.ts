// Simulador de preço por quantidade e prazo (change openspec
// simulador-preco-quantidade-prazo). Dois eixos, como a dona descreveu:
// - volume: o frete do afiliado logístico (pago pelo comprador) se dilui; mostra a
//   quantidade a partir da qual pedir mais quase não baixa o preço por unidade;
// - prazo: produzir sob encomenda baixa o custo do seller; o desconto recomendado é o
//   maior que mantém o lucro por unidade de hoje.
// Custo e economia só simulam: nada aqui grava.

import { MAX_QTD, freteRegiao, type Bandas } from "@/lib/logistica-parceiro/simulador-km";
import type { Degrau } from "@/lib/venda-futura/preco-curva";
import { liquidoDe, precoComDesconto } from "./montador-faixas";

const cents = (v: number) => Math.round(v * 100);
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Custo com N dias de antecedência: cai `economiaPctMes` a cada 30 dias, linear, nunca negativo. */
export function custoNoPrazo(custoHoje: number, economiaPctMes: number, dias: number): number {
  return r2(custoHoje * Math.max(0, 1 - (economiaPctMes / 100) * (dias / 30)));
}

/** Maior desconto inteiro (0..90) em que o lucro por unidade não fica abaixo do de hoje. */
export function descontoRecomendado(p: { valorAvista: number; comissaoPct: number; custoHoje: number; custoPrazo: number }): number {
  const lucroHoje = cents(liquidoDe(p.valorAvista, p.comissaoPct)) - cents(p.custoHoje);
  if (lucroHoje < 0) return 0;
  let max = 0;
  for (let d = 1; d <= 90; d++) {
    if (cents(liquidoDe(precoComDesconto(p.valorAvista, d), p.comissaoPct)) - cents(p.custoPrazo) < lucroHoje) break;
    max = d;
  }
  return max;
}

type Frete = { pesoUnitKg: number | null; bandas: Bandas | null; km: number };

const temFrete = (p: Frete): p is Frete & { pesoUnitKg: number; bandas: Bandas } =>
  p.pesoUnitKg != null && p.pesoUnitKg > 0 && p.bandas != null;

/** Quanto o comprador paga por unidade com o frete do afiliado; null sem peso ou bandas. */
export function compradorPorUnidade(p: Frete & { preco: number; qtd: number }): number | null {
  if (!temFrete(p)) return null;
  const frete = freteRegiao({ distanciaM: p.km * 1000, pesoKg: p.pesoUnitKg * p.qtd, bandas: p.bandas }).total;
  return r2(p.preco + frete / p.qtd);
}

/** Joelho da curva: menor quantidade a partir da mínima em que dobrar o pedido baixa menos
 * de 2% o preço por unidade com frete. ponytail: varre 1 a 1 até MAX_QTD (≤ 1000 contas). */
export function quantidadeViavel(p: Frete & { valorAvista: number; qtdMinima: number | null }): number {
  const min = Math.max(1, p.qtdMinima ?? 1);
  if (!temFrete(p)) return min;
  const un = (q: number) => p.valorAvista + freteRegiao({ distanciaM: p.km * 1000, pesoKg: p.pesoUnitKg * q, bandas: p.bandas }).total / q;
  for (let q = min; q <= MAX_QTD; q++) {
    if (un(Math.min(2 * q, MAX_QTD)) >= un(q) * 0.98) return q;
  }
  return MAX_QTD;
}

export function linhasPropostas(min: number, joelho: number): number[] {
  return [min, joelho, joelho * 2, joelho * 5]
    .filter((q) => q >= 1 && q <= MAX_QTD)
    .filter((q, i, a) => a.indexOf(q) === i)
    .sort((a, b) => a - b);
}

/** Degraus da venda futura a partir das colunas: prazo futuro com desconto, mais distante primeiro. */
export function curvaDosPrazos(prazos: { dias: number; descontoPct: number }[]): Degrau[] {
  return prazos
    .filter((p) => p.dias > 0 && p.descontoPct >= 1)
    .sort((a, b) => b.dias - a.dias)
    .map((p) => ({ dias_antes: p.dias, desconto_pct: p.descontoPct }));
}
