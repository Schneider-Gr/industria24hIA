import type { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/**
 * Sinaliza, em lote, quais produtos de uma listagem têm venda futura ou
 * compra coletiva disponível — para os botões rápidos do ProdutoCard.
 * Mesmas fontes que src/app/produto/[id]/page.tsx usa para decidir se
 * exibe cada seção, mas em 2 queries com `.in()` em vez de N+1 por produto.
 * A elegibilidade exata de coletiva (desconto real, estoque, prazo) segue
 * validada no PDP/RPC — aqui é só o sinal "existe a opção" para o card.
 */
export async function buscarFlagsRapidas(supabase: SupabaseServer, produtoIds: string[]) {
  if (produtoIds.length === 0) {
    return { vendaFutura: new Set<string>(), coletiva: new Set<string>() };
  }

  const [{ data: vendasFuturas }, { data: promocoes }, { data: regrasColetiva }] = await Promise.all([
    supabase.from("vendas_futuras").select("produto_id").in("produto_id", produtoIds).gt("estoque", 0),
    supabase
      .from("promocoes_progressivas")
      .select("produto_id")
      .in("produto_id", produtoIds)
      .eq("ativo", true),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tabela 0076 fora dos tipos gerados, mesmo padrão do PDP
    (supabase as any)
      .from("coletiva_regras")
      .select("produto_id")
      .in("produto_id", produtoIds)
      .eq("ativo", true),
  ]);

  const vendaFutura = new Set((vendasFuturas ?? []).map((v) => v.produto_id as string));
  const coletiva = new Set([
    ...(promocoes ?? []).map((p) => p.produto_id as string),
    ...((regrasColetiva ?? []) as Array<{ produto_id: string }>).map((r) => r.produto_id),
  ]);

  return { vendaFutura, coletiva };
}
