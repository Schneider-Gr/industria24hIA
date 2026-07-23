// Regra de desconto progressivo do checkout (preco_faixa, migration 0016; usada
// pela checkout_criar_pedido desde 0019/0037/0074): aplica o valor_unitario da
// faixa de MAIOR min_qtd <= quantidade, ignorando faixas vencidas; sem faixa
// aplicável, cobra o preço base.
//
// ponytail: réplica pura da função SQL em vez de chamar o banco — se a regra
// mudar na migration, mude aqui. Checks em preco-faixa.test.ts.

export type Faixa = { min_qtd: number; valor_unitario: number; validade?: string | null };

export function precoFaixa(
  faixas: Faixa[],
  ativo: boolean,
  qtd: number,
  base: number,
  hoje = new Date().toISOString().slice(0, 10)
): number {
  if (!ativo) return base;
  const aplicaveis = faixas
    .filter((f) => f.min_qtd <= qtd && (f.validade == null || f.validade >= hoje))
    .sort((a, b) => b.min_qtd - a.min_qtd);
  return aplicaveis[0]?.valor_unitario ?? base;
}

export function faixaVencida(f: Faixa, hoje = new Date().toISOString().slice(0, 10)): boolean {
  return f.validade != null && f.validade < hoje;
}
