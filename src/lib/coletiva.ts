// Regras da compra coletiva v2 (migrations 0076-0078) espelhadas em TS para a
// vitrine e o painel: preço do lote atingido, próximo lote e a divisão entre
// compradores no fechamento.
//
// ponytail: réplica pura das funções SQL (coletiva_preco_lote / coletiva_fechar)
// em vez de ida ao banco a cada render — se a regra mudar na migration, mude
// aqui também. Checks em coletiva.test.ts.

export type Lote = { min_qtd: number; valor_unitario: number; validade?: string | null };

const hojeISO = () => new Date().toISOString().slice(0, 10);

function vigentes(lotes: Lote[], hoje: string): Lote[] {
  return lotes.filter((l) => l.validade == null || l.validade >= hoje);
}

/** Preço do MELHOR lote já atingido por `qtd`; sem lote aplicável, o preço base. */
export function precoLote(lotes: Lote[], qtd: number, base: number, hoje = hojeISO()): number {
  const atingidos = vigentes(lotes, hoje)
    .filter((l) => l.min_qtd <= qtd)
    .sort((a, b) => b.min_qtd - a.min_qtd);
  return atingidos[0]?.valor_unitario ?? base;
}

/** Próximo lote ainda não atingido (o que a página anuncia como "faltam X un"). */
export function proximoLote(lotes: Lote[], qtd: number, hoje = hojeISO()): Lote | null {
  const futuros = vigentes(lotes, hoje)
    .filter((l) => l.min_qtd > qtd)
    .sort((a, b) => a.min_qtd - b.min_qtd);
  return futuros[0] ?? null;
}

export type Divisao = { quantidade: number; valor: number; frete: number; total: number };

/**
 * Divisão entre compradores no fechamento: cada um paga preço × sua quantidade,
 * e a sobra de centavos do total (e do frete rateado por quantidade) fica com o
 * MAIOR participante — assim a soma fecha exata com o total da coletiva.
 * Mesma ordem da RPC: quantidade desc.
 */
export function dividir(
  precoUnitario: number,
  quantidades: number[],
  freteTotal = 0,
): Divisao[] {
  const qtdTotal = quantidades.reduce((s, q) => s + q, 0);
  if (qtdTotal <= 0) return [];

  const cent = (n: number) => Math.round(n * 100) / 100;
  const total = cent(precoUnitario * qtdTotal);

  const ordenadas = [...quantidades].sort((a, b) => b - a);
  const partes = ordenadas.map((q) => ({
    quantidade: q,
    valor: cent(precoUnitario * q),
    frete: cent((freteTotal * q) / qtdTotal),
  }));

  const somaValor = cent(partes.reduce((s, p) => s + p.valor, 0));
  const somaFrete = cent(partes.reduce((s, p) => s + p.frete, 0));
  partes[0].valor = cent(partes[0].valor + (total - somaValor));
  partes[0].frete = cent(partes[0].frete + (freteTotal - somaFrete));

  return partes.map((p) => ({ ...p, total: cent(p.valor + p.frete) }));
}

/** Quanto cada participante economiza por unidade em relação ao preço base. */
export function economiaPorUnidade(base: number, precoAtual: number): number {
  return Math.round((base - precoAtual) * 100) / 100;
}
