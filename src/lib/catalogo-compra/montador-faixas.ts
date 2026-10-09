// Montador de faixas de desconto progressivo por custo e frete (change openspec
// montador-faixas-custo-frete, design D1–D6). Lógica da planilha do seller: o que ele
// recebe é a base, e o preço por unidade para o comprador cai porque o frete do
// afiliado logístico se divide entre mais unidades. Custo e markup só simulam: nada aqui
// grava. Frete pela mesma regra do checkout (freteRegiao, bandas do botão avião).

import { MAX_QTD, freteRegiao, simularRegiao, type Bandas } from "@/lib/logistica-parceiro/simulador-km";
import type { Faixa } from "@/lib/preco-faixa";

const cents = (v: number) => Math.round(v * 100);
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Preço com desconto inteiro, em centavos half-up (mesma conta do PRD 061). */
export function precoComDesconto(valor: number, pct: number): number {
  return Math.round((cents(valor) * (100 - pct)) / 100) / 100;
}

/** O que o seller recebe depois da comissão do nó. */
export function liquidoDe(preco: number, comissaoPct: number): number {
  return Math.round((cents(preco) * (100 - comissaoPct)) / 100) / 100;
}

/** Custo informado, ou o líquido à vista ÷ markup (ex.: 1,3). Nenhum → null. */
export function custoEquivalente(p: { custo: number | null; markup: number | null; liquidoAvista: number }): number | null {
  if (p.custo != null && p.custo > 0) return r2(p.custo);
  if (p.markup != null && p.markup > 1) return r2(p.liquidoAvista / p.markup);
  return null;
}

/** Maior desconto inteiro (0..90) em que o líquido não fica abaixo do custo. */
export function descontoMaximo(p: { valorAvista: number; comissaoPct: number; custo: number | null }): number | null {
  if (p.custo == null) return null;
  let max = 0;
  for (let d = 1; d <= 90; d++) {
    if (liquidoDe(precoComDesconto(p.valorAvista, d), p.comissaoPct) < p.custo) break;
    max = d;
  }
  return max;
}

export type FreteLinha = { total: number; porUn: number; pct: number; comprador: number };
export type LinhaMontador = {
  qtd: number;
  descontoPct: number;
  preco: number;
  liquido: number;
  markup: number | null;
  abaixoCusto: boolean;
  fretes: FreteLinha[] | null; // por distância de referência; null sem peso ou bandas
};

type Base = {
  valorAvista: number;
  comissaoPct: number;
  pesoUnitKg: number | null;
  bandas: Bandas | null;
  distanciasKm: number[];
};

const temFrete = (p: Base): p is Base & { pesoUnitKg: number; bandas: Bandas } =>
  p.pesoUnitKg != null && p.pesoUnitKg > 0 && p.bandas != null && Object.values(p.bandas).some((b) => b.valorKm != null || b.tarifaMinima != null);

export function linhaMontador(p: Base & { custo: number | null; qtd: number; descontoPct: number }): LinhaMontador {
  const preco = precoComDesconto(p.valorAvista, p.descontoPct);
  const liquido = liquidoDe(preco, p.comissaoPct);
  const fretes = temFrete(p)
    ? p.distanciasKm.map((km) => {
        const total = freteRegiao({ distanciaM: km * 1000, pesoKg: p.pesoUnitKg * p.qtd, bandas: p.bandas }).total;
        const porUn = r2(total / p.qtd);
        return { total, porUn, pct: r2(total / (preco * p.qtd)), comprador: r2(preco + porUn) };
      })
    : null;
  return {
    qtd: p.qtd,
    descontoPct: p.descontoPct,
    preco,
    liquido,
    markup: p.custo ? r2(liquido / p.custo) : null,
    abaixoCusto: p.custo != null && liquido < p.custo,
    fretes,
  };
}

/** Mínima, viável e ideal estáveis na distância "médio" (índice 1), e 10× a mínima. */
export function quantidadesPropostas(p: Base & { qtdMinima: number | null }): number[] {
  const min = Math.max(1, p.qtdMinima ?? 1);
  const extras = temFrete(p)
    ? (() => {
        const km = p.distanciasKm[1] ?? p.distanciasKm[0];
        const s = simularRegiao({ distanciaM: km * 1000, pesoUnitKg: p.pesoUnitKg, preco: p.valorAvista, qtd: min, bandas: p.bandas });
        return [s.viavel.estavel, s.ideal.estavel, min * 10];
      })()
    : [min * 3, min * 10];
  return [min, ...extras]
    .filter((q): q is number => q != null && q >= min && q <= MAX_QTD)
    .filter((q, i, a) => a.indexOf(q) === i)
    .sort((a, b) => a - b);
}

/** Faixas para promocoes_progressivas: só as que mudam o preço (desconto > 0, mais de 1 un). */
export function faixasParaGravar(linhas: LinhaMontador[]): Faixa[] {
  return linhas
    .filter((l) => l.descontoPct > 0 && l.qtd > 1)
    .sort((a, b) => a.qtd - b.qtd)
    .map((l) => ({ min_qtd: l.qtd, valor_unitario: l.preco, validade: null }));
}
