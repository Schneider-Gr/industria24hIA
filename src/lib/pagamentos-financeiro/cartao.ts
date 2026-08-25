// Regras de negócio do cartão de crédito parcelado + split nativo (migration
// 0148). Puro e testável — a chamada real à Asaas fica em asaas.ts, a
// orquestração (buscar pedido/loja, decidir se aplica split) em
// checkout/actions.ts.

const PARCELAS_MIN = 1;
const PARCELAS_MAX = 12;

export function validarParcelas(parcelas: number): boolean {
  return Number.isInteger(parcelas) && parcelas >= PARCELAS_MIN && parcelas <= PARCELAS_MAX;
}

// Valor de cada parcela, arredondado para centavos. Divisões não exatas
// (ex.: 100/3) deixam a Asaas absorver o resto de arredondamento na última
// parcela — comportamento do próprio gateway, não replicado aqui.
export function calcularValorParcela(valorTotal: number, parcelas: number): number {
  if (!validarParcelas(parcelas)) {
    throw new Error(`Número de parcelas inválido: ${parcelas}`);
  }
  return Math.round((valorTotal / parcelas) * 100) / 100;
}

// Soma o repasse_vendedor já calculado por item (preço/promoção por produto
// — não um percentual genérico) para virar o valor do split nativo Asaas.
export function somarRepasseVendedor(itens: { repasse_vendedor: number | null }[]): number {
  return itens.reduce((soma, item) => soma + (item.repasse_vendedor ?? 0), 0);
}
