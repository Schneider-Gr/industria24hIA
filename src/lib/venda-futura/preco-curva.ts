// Preço da venda futura com curva de desconto por antecedência (PRD 061, change
// openspec venda-futura-curva-e-minimo, design D2–D3).
//
// preço = faixa de volume × (1 − desconto do degrau vigente), em centavos inteiros,
// nunca acima do preço à vista. Lote sem curva = comportamento antigo (valor do lote).
//
// ponytail: réplica pura de public.venda_futura_preco (migration 0218), que é a fonte da
// verdade usada pelo checkout. Mudou a regra no SQL, mude aqui — os mesmos casos estão em
// preco-curva.test.ts e no teste em rollback da migration.

import { precoFaixa, type Faixa } from "@/lib/preco-faixa";

export type Degrau = { dias_antes: number; desconto_pct: number };

export const MAX_DEGRAUS = 3;
export const DESCONTO_MAX_PCT = 90;
export const ALERTA_MARGEM_PCT = 30;

const cents = (v: number) => Math.round(v * 100);

/** Dias entre a data da reserva e a entrega (datas YYYY-MM-DD, sem fuso). */
export function diasAteEntrega(entrega: string, data: string): number {
  return Math.round((Date.parse(`${entrega}T00:00:00Z`) - Date.parse(`${data}T00:00:00Z`)) / 86_400_000);
}

function somaDias(data: string, dias: number): string {
  return new Date(Date.parse(`${data}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
}

/** Degrau de maior dias_antes que ainda cabe até a entrega; nenhum → null. */
export function degrauVigente(curva: Degrau[], entrega: string | null, data: string): Degrau | null {
  if (!entrega || curva.length === 0) return null;
  const dias = diasAteEntrega(entrega, data);
  return [...curva].sort((a, b) => b.dias_antes - a.dias_antes).find((d) => d.dias_antes <= dias) ?? null;
}

/** Até quando o degrau atual vale (inclusive) e qual vem depois. Sem degrau → null. */
export function validoAte(curva: Degrau[], entrega: string, data: string): { ate: string; proximo: Degrau | null } | null {
  const atual = degrauVigente(curva, entrega, data);
  if (!atual) return null;
  const proximo = [...curva].sort((a, b) => b.dias_antes - a.dias_antes).find((d) => d.dias_antes < atual.dias_antes) ?? null;
  return { ate: somaDias(entrega, -atual.dias_antes), proximo };
}

export function validarCurva(curva: Degrau[]): string | null {
  if (curva.length > MAX_DEGRAUS) return `A curva aceita no máximo ${MAX_DEGRAUS} degraus.`;
  for (const d of curva) {
    if (!Number.isInteger(d.dias_antes) || d.dias_antes <= 0) return "Os dias de cada degrau precisam ser um número inteiro maior que zero.";
    if (!Number.isInteger(d.desconto_pct) || d.desconto_pct < 1 || d.desconto_pct > DESCONTO_MAX_PCT)
      return `O desconto de cada degrau precisa ser um número inteiro de 1 a ${DESCONTO_MAX_PCT}%.`;
  }
  const ordenada = [...curva].sort((a, b) => b.dias_antes - a.dias_antes);
  for (let i = 1; i < ordenada.length; i++) {
    if (ordenada[i].dias_antes === ordenada[i - 1].dias_antes) return "Há degraus com dias repetidos.";
    if (ordenada[i].desconto_pct > ordenada[i - 1].desconto_pct)
      return "O degrau mais distante da entrega precisa ter desconto maior ou igual ao seguinte.";
  }
  return null;
}

/** Aplica o desconto em centavos inteiros: round_half_up(faixa × (100 − pct) / 100). */
function comDesconto(valor: number, pct: number): number {
  return Math.round((cents(valor) * (100 - pct)) / 100) / 100;
}

export type EntradaPreco = {
  base: number; // preço à vista do produto
  faixas: Faixa[];
  ativo: boolean; // promoção progressiva ativa
  curva: Degrau[];
  entrega: string | null;
  qtd: number;
  data: string; // data da reserva (America/Manaus)
  valorLote?: number | null; // só para lote sem curva
  hojeFaixa?: string; // validade das faixas (o SQL usa current_date)
};

export function precoReserva(e: EntradaPreco): { preco: number; desconto_pct: number; faixa: number } {
  if (e.curva.length === 0) {
    const preco = e.valorLote ?? e.base;
    return { preco, desconto_pct: 0, faixa: preco };
  }
  const faixa = precoFaixa(e.faixas, e.ativo, e.qtd, e.base, e.hojeFaixa);
  const pct = degrauVigente(e.curva, e.entrega, e.data)?.desconto_pct ?? 0;
  return { preco: Math.min(comDesconto(faixa, pct), e.base), desconto_pct: pct, faixa };
}

export type Celula = { preco: number; descontoTotalPct: number; liquido: number };
export type Matriz = {
  colunas: Degrau[];
  linhas: { min_qtd: number; celulas: Celula[] }[];
  maiorDescontoPct: number;
};

/** Matriz do simulador: linhas = 1 un. e cada faixa de volume; colunas = degraus (mais distante primeiro). */
export function matrizSimulacao(p: {
  base: number;
  faixas: Faixa[];
  ativo: boolean;
  curva: Degrau[];
  comissaoPct: number;
  hojeFaixa?: string;
}): Matriz {
  const colunas = [...p.curva].sort((a, b) => b.dias_antes - a.dias_antes);
  const hoje = p.hojeFaixa ?? new Date().toISOString().slice(0, 10);
  const qtds = [1, ...(p.ativo ? p.faixas.filter((f) => f.validade == null || f.validade >= hoje).map((f) => f.min_qtd) : [])]
    .filter((q, i, a) => a.indexOf(q) === i)
    .sort((a, b) => a - b);
  let maiorDescontoPct = 0;
  const linhas = qtds.map((min_qtd) => {
    const faixa = precoFaixa(p.faixas, p.ativo, min_qtd, p.base, p.hojeFaixa);
    const celulas = colunas.map((d) => {
      const preco = Math.min(comDesconto(faixa, d.desconto_pct), p.base);
      const descontoTotalPct = Math.round((1 - preco / p.base) * 100);
      maiorDescontoPct = Math.max(maiorDescontoPct, descontoTotalPct);
      const liquido = Math.round((cents(preco) * (100 - p.comissaoPct)) / 100) / 100;
      return { preco, descontoTotalPct, liquido };
    });
    return { min_qtd, celulas };
  });
  return { colunas, linhas, maiorDescontoPct };
}

/** Receita do lote se toda a produção sair no menor e no maior preço da matriz. */
export function receitaLote(m: Matriz, producao: number): { min: number; max: number; liquidoMin: number; liquidoMax: number } {
  const cel = m.linhas.flatMap((l) => l.celulas);
  if (cel.length === 0 || producao <= 0) return { min: 0, max: 0, liquidoMin: 0, liquidoMax: 0 };
  const menor = cel.reduce((a, b) => (b.preco < a.preco ? b : a));
  const maior = cel.reduce((a, b) => (b.preco > a.preco ? b : a));
  const tot = (v: number) => (cents(v) * producao) / 100;
  return { min: tot(menor.preco), max: tot(maior.preco), liquidoMin: tot(menor.liquido), liquidoMax: tot(maior.liquido) };
}
