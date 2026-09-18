import type { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;
type Lote = { min_qtd: number; valor_unitario: number; validade?: string | null };
type ProdutoParaFlag = { id: string; valor: number };

/**
 * Menor preço que o card pode anunciar como "a partir de": o menor entre a
 * faixa válida de desconto progressivo e o preço de venda futura. Só retorna
 * quando é menor que o preço cheio; senão o card mostra o preço normal.
 */
export function menorPrecoVitrine(
  valor: number,
  faixas: Lote[],
  precosVendaFutura: number[],
  hoje: string,
): number | null {
  const candidatos = [
    ...faixas.filter((f) => !f.validade || f.validade >= hoje).map((f) => Number(f.valor_unitario)),
    ...precosVendaFutura.map(Number),
  ].filter((v) => Number.isFinite(v) && v > 0 && v < valor);
  return candidatos.length ? Math.min(...candidatos) : null;
}

/**
 * Sinaliza, em lote, quais produtos de uma listagem têm venda futura ou
 * compra coletiva disponível — para os botões rápidos do ProdutoCard.
 * Mesmas fontes que src/app/produto/[id]/page.tsx usa para decidir se
 * exibe cada seção, mas em 2 queries com `.in()` em vez de N+1 por produto.
 *
 * Réplica dois guards do PDP: "desconto real" (existem promoções/regras
 * cadastradas com faixa MAIS CARA que o produto — caso real já visto em
 * produção, ver feedback-benchmark-ads-marketplaces-ml-amazon) e faixa
 * vencida (achado em teste live 01/08: faixas com validade em julho, dia
 * corrente agosto — sem esse guard o card anunciava coletiva que o PDP não
 * mostra). Não replica o filtro de estoque por faixa (min_qtd <= estoque);
 * a validação exata continua no PDP/RPC.
 */
export async function buscarFlagsRapidas(supabase: SupabaseServer, produtos: ProdutoParaFlag[]) {
  const produtoIds = produtos.map((p) => p.id);
  if (produtoIds.length === 0) {
    return { vendaFutura: new Set<string>(), coletiva: new Set<string>(), menorPreco: new Map<string, number>() };
  }
  const valorPorProduto = new Map(produtos.map((p) => [p.id, p.valor]));

  const [{ data: vendasFuturas }, { data: promocoes }, { data: regrasColetiva }] = await Promise.all([
    supabase.from("vendas_futuras").select("produto_id, valor").in("produto_id", produtoIds).gt("estoque", 0),
    supabase
      .from("promocoes_progressivas")
      .select("produto_id, faixas")
      .in("produto_id", produtoIds)
      .eq("ativo", true),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0076 fora dos tipos gerados, mesmo padrão do PDP
    (supabase as any)
      .from("coletiva_regras")
      .select("produto_id, lotes")
      .in("produto_id", produtoIds)
      .eq("ativo", true),
  ]);

  const hoje = new Date().toISOString().slice(0, 10);
  const temFaixaValida = (produtoId: string, lotes: unknown): boolean => {
    const valorProduto = valorPorProduto.get(produtoId);
    if (valorProduto == null || !Array.isArray(lotes)) return false;
    return (lotes as Lote[]).some(
      (l) => Number(l.valor_unitario) < valorProduto && (!l.validade || l.validade >= hoje),
    );
  };

  const vendaFutura = new Set((vendasFuturas ?? []).map((v) => v.produto_id as string));
  const coletiva = new Set<string>();
  for (const p of (promocoes ?? []) as Array<{ produto_id: string; faixas: unknown }>) {
    if (temFaixaValida(p.produto_id, p.faixas)) coletiva.add(p.produto_id);
  }
  for (const r of (regrasColetiva ?? []) as Array<{ produto_id: string; lotes: unknown }>) {
    if (temFaixaValida(r.produto_id, r.lotes)) coletiva.add(r.produto_id);
  }

  const faixasPorProduto = new Map<string, Lote[]>();
  for (const p of (promocoes ?? []) as Array<{ produto_id: string; faixas: unknown }>) {
    if (Array.isArray(p.faixas)) faixasPorProduto.set(p.produto_id, [...(faixasPorProduto.get(p.produto_id) ?? []), ...(p.faixas as Lote[])]);
  }
  const vfPorProduto = new Map<string, number[]>();
  for (const v of vendasFuturas ?? []) {
    if (v.valor != null) vfPorProduto.set(v.produto_id as string, [...(vfPorProduto.get(v.produto_id as string) ?? []), Number(v.valor)]);
  }
  const menorPreco = new Map<string, number>();
  for (const { id, valor } of produtos) {
    const m = menorPrecoVitrine(valor, faixasPorProduto.get(id) ?? [], vfPorProduto.get(id) ?? [], hoje);
    if (m != null) menorPreco.set(id, m);
  }

  return { vendaFutura, coletiva, menorPreco };
}
