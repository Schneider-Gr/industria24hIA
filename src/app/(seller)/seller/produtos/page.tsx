import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/seller/KpiCard";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { ProdutoForm } from "@/components/seller/ProdutoForm";
import { ProdutoLinha } from "@/components/seller/ProdutoLinha";
import { formatBRL } from "@/components/seller/format";

export const dynamic = "force-dynamic";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();

  const [produtosRes, categoriasRes, subcategoriasRes, centrosRes] = await Promise.all([
    supabase
      .from("produtos")
      .select(
        "id, nome, valor, estoque_atual, quantidade_minima, sku, cep_produto, status_produto, created_at, categoria_id, subcategoria_id, permite_afiliacao, porcentagem_afiliado, altura, comprimento, largura, peso, descricao, produto_imagens(url)",
      )
      .eq("loja_id", loja.id)
      .order("created_at", { ascending: false }),
    supabase.from("categorias").select("id, nome").order("nome"),
    supabase.from("subcategorias").select("id, nome, categoria_id").order("nome"),
    supabase.from("centros_distribuicao").select("*").eq("loja_id", loja.id),
  ]);

  if (produtosRes.error) {
    return <ErrorState title="Falha ao carregar produtos" detail={produtosRes.error.message} />;
  }

  const { q, status } = await searchParams;
  const todos = produtosRes.data ?? [];
  const statusDisponiveis = [...new Set(todos.map((p) => p.status_produto))].sort();
  const produtos = todos.filter(
    (p) =>
      (!q || p.nome.toLowerCase().includes(q.toLowerCase())) &&
      (!status || p.status_produto === status),
  );
  // KPIs sempre sobre o catálogo inteiro (como no painel Bubble), não sobre o filtro.
  const valorEstoque = todos.reduce(
    (s, p) => s + (p.valor ?? 0) * (p.estoque_atual ?? 0),
    0,
  );
  const criticos = todos.filter(
    (p) => p.quantidade_minima != null && (p.estoque_atual ?? 0) < p.quantidade_minima,
  ).length;

  return (
    <div>
      <PageTitle title="Produtos" subtitle="Gerencie o catálogo da sua loja" />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total de produtos" value={todos.length} />
        <KpiCard label="Valor total em estoque" value={formatBRL(valorEstoque)} />
        <KpiCard label="Estoque crítico" value={criticos} accent={criticos > 0 ? "warning" : "default"} />
      </div>

      <div className="mb-8">
        <ProdutoForm
          categorias={categoriasRes.data ?? []}
          subcategorias={subcategoriasRes.data ?? []}
          centros={centrosRes.data ?? []}
        />
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar"
          className="w-64 rounded border border-line bg-surface px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded border border-line bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          {statusDisponiveis.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded bg-roxo-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Filtrar
        </button>
      </form>

      {produtos.length === 0 ? (
        <VazioBox>
          {todos.length === 0
            ? 'Nenhum produto cadastrado. Use "Cadastrar Novo" acima.'
            : "Nenhum produto encontrado com esse filtro."}
        </VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border-line border">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-medium">Imagem</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-medium">Produto</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-medium">SKU</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-medium">Valor</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-medium">Estoque</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-medium">Mínimo</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-medium">DT criação</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-medium">Valor Estoque</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-medium">Status</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <ProdutoLinha
                  key={p.id}
                  produto={p}
                  loja={loja}
                  categorias={categoriasRes.data ?? []}
                  subcategorias={subcategoriasRes.data ?? []}
                  centros={centrosRes.data ?? []}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
