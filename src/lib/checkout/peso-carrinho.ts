// Peso real do carrinho para a cotação de frete (item 5 do follow-up de
// transportadoras). Produto sem `peso` cadastrado conta como 0 — mesmo
// placeholder já documentado em docs/prd/fluxo-frete-completo.md (só
// 89/358 produtos têm peso confiável), não um valor inventado.

export type ItemCarrinhoPeso = { produto_id: string; quantidade: number };

export function calcularPesoCarrinho(
  itens: ItemCarrinhoPeso[],
  pesosPorProduto: Record<string, number | null | undefined>,
): number {
  return itens.reduce((total, item) => {
    const peso = pesosPorProduto[item.produto_id] ?? 0;
    return total + peso * item.quantidade;
  }, 0);
}
