// Duas travas de compra mínima que a `checkout_criar_pedido` já aplica no
// banco e que até aqui eram invisíveis no carrinho:
//   - quantidade mínima por produto  (`produtos.quantidade_minima`, 0140:139)
//   - ticket mínimo por loja         (`lojas.valor_pedido_minimo`,  0140:214)
//
// ponytail: réplica pura da regra do banco para decidir a UI. O banco continua
// sendo a autoridade — isto existe para o comprador não descobrir a trava só
// depois de preencher o checkout inteiro.
//
// O subtotal usado aqui aplica desconto progressivo (`precoFaixa`), porque é
// o que o banco compara (`v_total_itens`). Comparar pelo preço-tabela deixaria
// a UI liberar um grupo que o banco reprova.

import { precoFaixa, type Faixa } from "@/lib/preco-faixa";

export type ItemAvaliado = {
  produto_id: string;
  nome: string;
  valor: number;
  quantidade: number;
  quantidade_minima: number | null;
};

export type ItemAbaixoDoMinimo = {
  produto_id: string;
  nome: string;
  quantidade: number;
  quantidade_minima: number;
};

export type AvaliacaoGrupo = {
  /** Subtotal com desconto progressivo, sem frete — mesma base do banco. */
  subtotal: number;
  /** `null` quando a loja não define ticket mínimo. */
  ticketMinimo: number | null;
  /** Quanto falta para atingir o ticket; 0 quando já atinge ou não há ticket. */
  gap: number;
  itensAbaixoDoMinimo: ItemAbaixoDoMinimo[];
  /** Apto ao fechamento: as DUAS travas precisam passar. */
  apto: boolean;
  motivo: "ticket_minimo" | "quantidade_minima" | "ambos" | null;
};

export function subtotalComFaixa(
  itens: ItemAvaliado[],
  faixasPorProduto: Record<string, Faixa[]>,
): number {
  return itens.reduce((soma, item) => {
    const unitario = precoFaixa(
      faixasPorProduto[item.produto_id] ?? [],
      true,
      item.quantidade,
      item.valor,
    );
    return soma + unitario * item.quantidade;
  }, 0);
}

export function avaliarGrupo(
  itens: ItemAvaliado[],
  ticketMinimo: number | null | undefined,
  faixasPorProduto: Record<string, Faixa[]> = {},
): AvaliacaoGrupo {
  const subtotal = subtotalComFaixa(itens, faixasPorProduto);
  const ticket = ticketMinimo != null && ticketMinimo > 0 ? ticketMinimo : null;
  const gap = ticket != null ? Math.max(0, ticket - subtotal) : 0;

  const itensAbaixoDoMinimo = itens
    .filter((i) => i.quantidade_minima != null && i.quantidade < i.quantidade_minima)
    .map((i) => ({
      produto_id: i.produto_id,
      nome: i.nome,
      quantidade: i.quantidade,
      quantidade_minima: i.quantidade_minima as number,
    }));

  const falhaTicket = gap > 0;
  const falhaQuantidade = itensAbaixoDoMinimo.length > 0;

  return {
    subtotal,
    ticketMinimo: ticket,
    gap,
    itensAbaixoDoMinimo,
    apto: !falhaTicket && !falhaQuantidade,
    motivo:
      falhaTicket && falhaQuantidade
        ? "ambos"
        : falhaTicket
          ? "ticket_minimo"
          : falhaQuantidade
            ? "quantidade_minima"
            : null,
  };
}

/** Sugestões que fecham o gap: prioriza a faixa de 60% a 130% do que falta e,
 * fora dela, o candidato mais próximo do valor faltante. */
export function ordenarPorGap<T extends { valor: number }>(candidatos: T[], gap: number): T[] {
  if (gap <= 0) return candidatos;
  const piso = gap * 0.6;
  const teto = gap * 1.3;
  const naFaixa = (c: T) => c.valor >= piso && c.valor <= teto;
  return candidatos.slice().sort((a, b) => {
    if (naFaixa(a) !== naFaixa(b)) return naFaixa(a) ? -1 : 1;
    return Math.abs(a.valor - gap) - Math.abs(b.valor - gap);
  });
}
