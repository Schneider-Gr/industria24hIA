import type { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;
type Lote = { min_qtd: number; valor_unitario: number; validade?: string | null };
type ProdutoParaFlag = { id: string; valor: number };

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
    return { vendaFutura: new Set<string>(), coletiva: new Set<string>() };
  }
  const valorPorProduto = new Map(produtos.map((p) => [p.id, p.valor]));

  const [{ data: vendasFuturas }, { data: promocoes }, { data: regrasColetiva }] = await Promise.all([
    supabase.from("vendas_futuras").select("produto_id").in("produto_id", produtoIds).gt("estoque", 0),
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

  return { vendaFutura, coletiva };
}
