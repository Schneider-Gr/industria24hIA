import { VitrineHeader, VitrineFooter, ProdutoCard, TituloSecao } from "@/components/vitrine/ui";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import Link from "next/link";
import { cookies } from "next/headers";
import { lerEnderecoCookie, lojaCobreCep, CEP_COOKIE, type FaixaCep } from "@/lib/cep";
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
    .select("id, nome, valor, quantidade_minima, loja_id, produto_imagens(url, ordem)")
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

  // Cobertura por CEP (mesma regra de src/app/page.tsx e categoria/[id]/page.tsx,
  // decisão 2026-07-14): sem CEP salvo mostra tudo; com CEP, esconde produto de
  // loja que nenhuma faixa cobre. A busca não aplicava esse filtro até agora —
  // ver nota em DESIGN.md sobre a correção desse gap.
  const cookieStore = await cookies();
  const cepComprador = lerEnderecoCookie(cookieStore.get(CEP_COOKIE)?.value)?.cep ?? null;
  const { data: faixasCep } = await supabase
    .from("faixas_cep")
    .select("cep_inicial, cep_final, loja_id, ativo")
    .eq("ativo", true);
  const faixas = (faixasCep ?? []) as FaixaCep[];
  const cobreLoja = (lojaId: string) => !cepComprador || lojaCobreCep(faixas, lojaId, cepComprador);

  const lojaIdsBusca = [...new Set((produtosRaw ?? []).map((p) => p.loja_id))];
  const { data: lojasBusca } = lojaIdsBusca.length
    ? await supabase.from("lojas_vitrine").select("id, cidade, estado").in("id", lojaIdsBusca)
    : { data: [] as { id: string; cidade: string | null; estado: string | null }[] };
  const lojaPorIdBusca = new Map((lojasBusca ?? []).map((l) => [l.id, l]));

  const produtos = (produtosRaw ?? [])
    .filter((p) => cobreLoja(p.loja_id))
    .filter((p) => !idsLojaRetirada || idsLojaRetirada.has(p.loja_id))
    .map((p) => {
      const imagens = Array.isArray(p.produto_imagens) ? p.produto_imagens : [];
      const primeira = [...imagens].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))[0];
      return { ...p, imagem_url: primeira?.url ?? null };
    });

  const { vendaFutura, coletiva } = await buscarFlagsRapidas(
    supabase,
    produtos.map((p) => p.id),
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
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="submit"
                  name="categoria_id"
                  value=""
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                    !categoriaId ? "bg-aco-600 text-white" : "border border-line text-ink-2"
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
                        ? "bg-aco-600 text-white"
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
              className="rounded-sm bg-aco-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-aco-900"
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
            <Link href="/" className="text-aco-600 underline underline-offset-2">
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
                  temVendaFutura={vendaFutura.has(p.id)}
                  temCompraColetiva={coletiva.has(p.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>
      <VitrineFooter />
    </div>
  );
}
