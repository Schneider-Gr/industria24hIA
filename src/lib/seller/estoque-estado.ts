// Classificação de estoque usada no painel do seller e no alerta por e-mail.
//
// O painel já contava "sem estoque" (`lte estoque_atual 0`) no sidebar, mas
// somava num único número o produto que PAROU de vender e o que está prestes a
// parar — e não dizia se o produto ainda aparece na vitrine por ter venda
// futura. As três respostas vêm daqui.

/** Limiar de "crítico" quando o seller não declarou o estoque crítico. */
export const ESTOQUE_CRITICO_PADRAO = 5;

export type EstadoEstoque = "esgotado" | "critico" | "normal";

export type ProdutoEstoque = {
  estoque_atual: number | null;
  /** Estoque crítico do produto (0198). Não é o mínimo por pedido (`quantidade_minima`). */
  estoque_critico?: number | null;
  /** Há oferta de venda futura com saldo? Esgotado + reserva continua vendendo. */
  temReserva?: boolean;
};

export function estadoEstoque(p: ProdutoEstoque): EstadoEstoque {
  const saldo = p.estoque_atual ?? 0;
  if (saldo <= 0) return "esgotado";
  const limiar = p.estoque_critico != null && p.estoque_critico > 0
    ? p.estoque_critico
    : ESTOQUE_CRITICO_PADRAO;
  return saldo <= limiar ? "critico" : "normal";
}

/** Esgotado sem reserva = fora da vitrine (migration 0173). */
export function foraDaVitrine(p: ProdutoEstoque): boolean {
  return estadoEstoque(p) === "esgotado" && !p.temReserva;
}

/** Esgotado, mas ainda vendendo: a reserva segura o produto na vitrine. */
export function vendendoPorReserva(p: ProdutoEstoque): boolean {
  return estadoEstoque(p) === "esgotado" && Boolean(p.temReserva);
}

export function rotuloEstado(p: ProdutoEstoque): string {
  if (vendendoPorReserva(p)) return "Esgotado · vendendo por reserva";
  if (foraDaVitrine(p)) return "Esgotado · fora da vitrine";
  if (estadoEstoque(p) === "critico") return "Estoque crítico";
  return "Em estoque";
}
