// Margem do seller por desconto (change montador-faixas-custo-frete D1–D3; a tela agora
// é o simulador de preço, change simulador-preco-quantidade-prazo). Custo e markup só
// simulam: nada aqui grava.

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
