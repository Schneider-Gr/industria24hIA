import { VitrineHeader, VitrineFooter, ProdutoCard, TituloSecao } from "@/components/vitrine/ui";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import Link from "next/link";
import { cookies } from "next/headers";
import { buscarFlagsRapidas } from "@/lib/vitrine-quick-flags";

export const dynamic = "force-dynamic";

type Ordenacao = "recentes" | "menor_preco" | "maior_preco";

// Filtros de busca (DESIGN.md, avaliação 2026-07-17, inspirado no Mercado
// Livre): categoria, faixa de preço, retirada na loja e ordenação — todos
// sobre colunas já confirmadas em docs/database.md (produtos.categoria_id,
// produtos.valor, lojas_vitrine.permite_retirada_na_loja). Filtros técnicos
// por atributo (marca/voltagem/potência) ficam de fora — exigem tabela nova,
// ver docs/redesign-vitrine-navegacao-ml-2026-07-17.md seção 2.
export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoria_id?: string;
    preco_min?: string;
    preco_max?: string;
    retirada?: string;
    ordenar?: string;
  }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local (ou nas env vars da Vercel em produção)."
      />
    );
  }

  const { q, categoria_id, preco_min, preco_max, retirada, ordenar } = await searchParams;
  const termo = (q ?? "").trim();
  const categoriaId = categoria_id?.trim() || "";
  const precoMin = preco_min ? Number(preco_min) : null;
  const precoMax = preco_max ? Number(preco_max) : null;
  const retiradaOnly = retirada === "1";
  const ordenacao: Ordenacao =
    ordenar === "menor_preco" || ordenar === "maior_preco" ? ordenar : "recentes";

  const supabase = await createClient();

  const { data: categorias } = await supabase.from("categorias").select("id, nome").order("nome");

  let query = supabase
    .from("produtos")
    .select("id, nome, valor, quantidade_minima, loja_id, categoria_id, permite_afiliacao, produto_imagens(url, ordem)")
    .ilike("nome", `%${termo}%`)
    .gt("valor", 0);

  if (categoriaId) query = query.eq("categoria_id", categoriaId);
  if (precoMin != null && !Number.isNaN(precoMin)) query = query.gte("valor", precoMin);
  if (precoMax != null && !Number.isNaN(precoMax)) query = query.lte("valor", precoMax);

  query =
    ordenacao === "menor_preco"
      ? query.order("valor", { ascending: true })
      : ordenacao === "maior_preco"
        ? query.order("valor", { ascending: false })
        : query.order("created_at", { ascending: false });

  const { data: produtosRaw, error } = termo ? await query.limit(48) : { data: [], error: null };

  // Retirada na loja: atributo da loja, não do produto — busca as lojas que
  // permitem e filtra em memória (mesmo padrão de join manual já usado em
  // src/app/page.tsx para desconto progressivo/venda futura).
  let idsLojaRetirada: Set<string> | null = null;
  if (retiradaOnly && produtosRaw && produtosRaw.length > 0) {
    const lojaIds = [...new Set(produtosRaw.map((p) => p.loja_id))];
    const { data: lojasRetirada } = await supabase
      .from("lojas_vitrine")
      .select("id")
      .in("id", lojaIds)
      .eq("permite_retirada_na_loja", true);
    idsLojaRetirada = new Set(
      (lojasRetirada ?? []).map((l) => l.id).filter((id): id is string => !!id)
    );
  }

  const lojaIdsBusca = [...new Set((produtosRaw ?? []).map((p) => p.loja_id))];
  const { data: lojasBusca } = lojaIdsBusca.length
    ? await supabase.from("lojas_vitrine").select("id, nome, cidade, estado").in("id", lojaIdsBusca)
    : { data: [] as { id: string; nome: string | null; cidade: string | null; estado: string | null }[] };
  const lojaPorIdBusca = new Map((lojasBusca ?? []).map((l) => [l.id, l]));

  const produtos = (produtosRaw ?? [])
    .filter((p) => !idsLojaRetirada || idsLojaRetirada.has(p.loja_id))
    .map((p) => {
      const imagens = Array.isArray(p.produto_imagens) ? p.produto_imagens : [];
      const primeira = [...imagens].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))[0];
      return { ...p, imagem_url: primeira?.url ?? null };
    });

  // Upsell (mesma categoria, opção mais cara que a média do resultado) e
  // cross-sell (comprado junto, via linha_itens de pedidos reais — sem
  // histórico de compra em comum, cai pro fallback de "mais dessas lojas")
  // só fazem sentido com termo buscado e resultado não vazio.
  const idsAtuais = produtos.map((p) => p.id);
  let upsell: typeof produtos = [];
  let crossSell: typeof produtos = [];

  if (termo && produtos.length > 0) {
    const hidratar = async (ids: string[]) => {
      if (ids.length === 0) return [] as typeof produtos;
      const { data: rows } = await supabase
        .from("produtos")
        .select("id, nome, valor, quantidade_minima, loja_id, categoria_id, permite_afiliacao, produto_imagens(url, ordem)")
        .in("id", ids)
        .gt("valor", 0);
      return (rows ?? [])
            .map((p) => {
          const imagens = Array.isArray(p.produto_imagens) ? p.produto_imagens : [];
          const primeira = [...imagens].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))[0];
          return { ...p, imagem_url: primeira?.url ?? null };
        });
    };

    // Upsell: mesma categoria dos resultados, valor acima da média encontrada.
    const categoriaIdsAtuais = [...new Set(produtos.map((p) => p.categoria_id).filter(Boolean))];
    const mediaValor = produtos.reduce((soma, p) => soma + p.valor, 0) / produtos.length;
    if (categoriaIdsAtuais.length > 0) {
      const { data: candidatosUpsell } = await supabase
        .from("produtos")
        .select("id")
        .in("categoria_id", categoriaIdsAtuais as string[])
        .gt("valor", mediaValor)
        .order("valor", { ascending: false })
        .limit(20);
      const idsUpsell = (candidatosUpsell ?? [])
        .map((p) => p.id)
        .filter((id) => !idsAtuais.includes(id))
        .slice(0, 5);
      upsell = await hidratar(idsUpsell);
    }

    // Cross-sell: produtos que apareceram nos mesmos pedidos que os
    // resultados da busca (linha_itens), contados e ranqueados por
    // frequência. Marketplace novo tende a ter pouco histórico de pedido em
    // comum — sem coocorrência, cai pro fallback de outras lojas dos
    // resultados (mesmo princípio do "quem vende isso também vende").
    const { data: pedidosComProduto } = await supabase
      .from("linha_itens")
      .select("pedido_id")
      .in("produto_id", idsAtuais);
    const pedidoIds = [...new Set((pedidosComProduto ?? []).map((l) => l.pedido_id))];
    let idsCrossSell: string[] = [];
    if (pedidoIds.length > 0) {
      const { data: itensDosPedidos } = await supabase
        .from("linha_itens")
        .select("produto_id")
        .in("pedido_id", pedidoIds);
      const contagem = new Map<string, number>();
      for (const item of itensDosPedidos ?? []) {
        if (!item.produto_id || idsAtuais.includes(item.produto_id)) continue;
        contagem.set(item.produto_id, (contagem.get(item.produto_id) ?? 0) + 1);
      }
      idsCrossSell = [...contagem.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);
    }
    if (idsCrossSell.length === 0) {
      const { data: outrosDaLoja } = await supabase
        .from("produtos")
        .select("id")
        .in("loja_id", lojaIdsBusca)
        .gt("valor", 0)
        .order("created_at", { ascending: false })
        .limit(20);
      idsCrossSell = (outrosDaLoja ?? [])
        .map((p) => p.id)
        .filter((id) => !idsAtuais.includes(id))
        .slice(0, 5);
    }
    crossSell = await hidratar(idsCrossSell);
  }

  const lojaIdsExtras = [...new Set([...upsell, ...crossSell].map((p) => p.loja_id))].filter(
    (id) => !lojaPorIdBusca.has(id),
  );
  const { data: lojasExtras } = lojaIdsExtras.length
    ? await supabase.from("lojas_vitrine").select("id, nome, cidade, estado").in("id", lojaIdsExtras)
    : { data: [] as { id: string; nome: string | null; cidade: string | null; estado: string | null }[] };
  const lojaPorIdExtra = new Map([...lojaPorIdBusca, ...(lojasExtras ?? []).map((l) => [l.id, l] as const)]);

  const { vendaFutura, coletiva } = await buscarFlagsRapidas(
    supabase,
    [...produtos, ...upsell, ...crossSell].map((p) => ({ id: p.id, valor: p.valor })),
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <VitrineHeader />
      <main className="anim-entra mx-auto w-full max-w-[1280px] flex-1 px-4 py-8 sm:px-6">
        <TituloSecao kicker="Busca">
          {termo ? `Resultados para “${termo}”` : "O que você procura?"}
        </TituloSecao>

        {termo && (
          <form
            action="/busca"
            className="mb-6 flex flex-wrap items-end gap-3 rounded-md border border-line bg-surface p-4"
          >
            <input type="hidden" name="q" value={termo} />

            <div className="flex w-full flex-col gap-1 text-xs font-medium text-ink-2">
              Categoria
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="submit"
                  name="categoria_id"
                  value=""
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                    !categoriaId ? "bg-lm-azul text-white" : "border border-line text-ink-2"
                  }`}
                >
                  Todas
                </button>
                {(categorias ?? []).map((cat) => (
                  <button
                    key={cat.id}
                    type="submit"
                    name="categoria_id"
                    value={cat.id}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                      categoriaId === cat.id
                        ? "bg-lm-azul text-white"
                        : "border border-line text-ink-2"
                    }`}
                  >
                    {cat.nome}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1 text-xs font-medium text-ink-2">
              Preço mín.
              <input
                type="number"
                name="preco_min"
                min={0}
                defaultValue={preco_min ?? ""}
                placeholder="R$"
                className="num w-24 rounded-sm border border-line bg-white px-2.5 py-1.5 text-sm text-ink"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-ink-2">
              Preço máx.
              <input
                type="number"
                name="preco_max"
                min={0}
                defaultValue={preco_max ?? ""}
                placeholder="R$"
                className="num w-24 rounded-sm border border-line bg-white px-2.5 py-1.5 text-sm text-ink"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-ink-2">
              Ordenar por
              <select
                name="ordenar"
                defaultValue={ordenacao}
                className="rounded-sm border border-line bg-white px-2.5 py-1.5 text-sm text-ink"
              >
                <option value="recentes">Mais recentes</option>
                <option value="menor_preco">Menor preço</option>
                <option value="maior_preco">Maior preço</option>
              </select>
            </label>

            <label className="flex items-center gap-2 pb-1.5 text-sm text-ink-2">
              <input
                type="checkbox"
                name="retirada"
                value="1"
                defaultChecked={retiradaOnly}
                className="h-4 w-4 rounded-sm border-line accent-aco-600"
              />
              Retirada na loja
            </label>

            <button
              type="submit"
              className="rounded-sm bg-lm-azul px-4 py-1.5 text-sm font-semibold text-white hover:bg-lm-marinho"
            >
              Aplicar filtros
            </button>
          </form>
        )}

        {error ? (
          <ErrorState title="Não foi possível buscar" detail={error.message} />
        ) : !termo ? (
          <p className="text-sm text-muted">
            Digite um termo na busca acima para encontrar produtos.
          </p>
        ) : produtos.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-surface p-10 text-center text-sm text-muted">
            Nenhum produto encontrado para “{termo}”.{" "}
            <Link href="/" className="text-lm-azul underline underline-offset-2">
              Ver todas as lojas
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              <span className="num font-semibold text-ink">{produtos.length}</span>{" "}
              produto{produtos.length > 1 ? "s" : ""} encontrado
              {produtos.length > 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
              {produtos.map((p) => (
                <ProdutoCard
                  key={p.id}
                  produto={p}
                  lojaCidade={lojaPorIdBusca.get(p.loja_id)?.cidade}
                  lojaEstado={lojaPorIdBusca.get(p.loja_id)?.estado}
                  lojaNome={lojaPorIdBusca.get(p.loja_id)?.nome}
                  temVendaFutura={vendaFutura.has(p.id)}
                  temCompraColetiva={coletiva.has(p.id)}
                />
              ))}
            </div>

            {upsell.length > 0 && (
              <section className="mt-10">
                <TituloSecao kicker="Vale a pena considerar">Uma opção melhor</TituloSecao>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
                  {upsell.map((p) => (
                    <ProdutoCard
                      key={p.id}
                      produto={p}
                      lojaCidade={lojaPorIdExtra.get(p.loja_id)?.cidade}
                      lojaEstado={lojaPorIdExtra.get(p.loja_id)?.estado}
                      lojaNome={lojaPorIdExtra.get(p.loja_id)?.nome}
                      temVendaFutura={vendaFutura.has(p.id)}
                      temCompraColetiva={coletiva.has(p.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {crossSell.length > 0 && (
              <section className="mt-10">
                <TituloSecao kicker="Combina com sua busca">Costuma ser comprado junto</TituloSecao>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
                  {crossSell.map((p) => (
                    <ProdutoCard
                      key={p.id}
                      produto={p}
                      lojaCidade={lojaPorIdExtra.get(p.loja_id)?.cidade}
                      lojaEstado={lojaPorIdExtra.get(p.loja_id)?.estado}
                      lojaNome={lojaPorIdExtra.get(p.loja_id)?.nome}
                      temVendaFutura={vendaFutura.has(p.id)}
                      temCompraColetiva={coletiva.has(p.id)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <VitrineFooter />
    </div>
  );
}
