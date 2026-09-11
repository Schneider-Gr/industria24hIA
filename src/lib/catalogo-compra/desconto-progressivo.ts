// Resumo do desconto progressivo para o card da vitrine (change
// mobile-vitrine-densa-benchmark): o menor preço de faixa que o comprador
// ainda pode pegar, a quantidade que o ativa e o percentual. Mesma regra de
// validade de `preco-faixa.ts` (vence no dia seguinte à `validade`), para o
// card não anunciar um preço que o checkout recusaria.

export type FaixaPromo = { min_qtd: number; valor_unitario: number; validade?: string | null };

export type ResumoDesconto = {
  menorPreco: number;
  minQtd: number;
  percentual: number;
  /** YYYY-MM-DD da faixa escolhida; null quando a faixa não vence. */
  validade: string | null;
};

/** `hoje` em YYYY-MM-DD. Faixa vencida ou sem desconto real é ignorada. */
export function resumoDescontoProgressivo(
  valorBase: number,
  faixas: FaixaPromo[],
  hoje: string,
): ResumoDesconto | null {
  const validas = faixas.filter(
    (f) => Number(f.valor_unitario) < valorBase && (f.validade == null || f.validade >= hoje),
  );
  if (validas.length === 0) return null;

  const melhor = validas.reduce((a, b) =>
    b.valor_unitario < a.valor_unitario || (b.valor_unitario === a.valor_unitario && b.min_qtd < a.min_qtd)
      ? b
      : a,
  );
  return {
    menorPreco: Number(melhor.valor_unitario),
    minQtd: melhor.min_qtd,
    percentual: Math.round((1 - melhor.valor_unitario / valorBase) * 100),
    validade: melhor.validade ?? null,
  };
}

/** Data em que a primeira oferta vence — o cronômetro só existe com ela. */
export function validadeMaisProxima<T extends { validade?: string | null }>(
  resumos: (T | null)[],
): string | null {
  let menor: string | null = null;
  for (const r of resumos) {
    if (r?.validade && (menor === null || r.validade < menor)) menor = r.validade;
  }
  return menor;
}
