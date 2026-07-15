import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/seller/KpiCard";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { ProdutoForm } from "@/components/seller/ProdutoForm";
import { formatBRL, formatData } from "@/components/seller/format";
import { excluirProduto, salvarValorMinimo, atualizarParceiroLogisticoHabilitado } from "./actions";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- coluna 0051 fora dos tipos gerados
    (supabase as any)
      .from("produtos")
      .select(
        "id, nome, valor, estoque_atual, quantidade_minima, sku, status_produto, created_at, parceiro_logistico_habilitado"
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

  type ProdutoLinha = {
    id: string;
    nome: string;
    valor: number | null;
    estoque_atual: number | null;
    quantidade_minima: number | null;
    sku: string | null;
    status_produto: string;
    created_at: string;
    parceiro_logistico_habilitado: boolean;
  };

  const { q, status } = await searchParams;
  const todos = (produtosRes.data ?? []) as ProdutoLinha[];
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
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-medium">Produto</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-medium">SKU</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-medium">Valor</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-medium">Estoque</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-medium">Mínimo</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-medium">DT criação</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-medium">Valor Estoque</th>
                <th className="px-4 py-2 text-left text-[11px] uppercase tracking-wider text-muted font-medium">Status</th>
                <th className="px-4 py-2 text-center text-[11px] uppercase tracking-wider text-muted font-medium">Parc. logístico</th>
                <th className="px-4 py-2 text-right text-[11px] uppercase tracking-wider text-muted font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => {
                const critico =
                  p.quantidade_minima != null && (p.estoque_atual ?? 0) < p.quantidade_minima;
                return (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-4 py-2 text-ink">{p.nome}</td>
                    <td className="px-4 py-2 font-mono text-xs text-ink-2">{p.sku ?? "—"}</td>
                    <td className="px-4 py-2 text-right num font-semibold text-ink">{formatBRL(p.valor)}</td>
                    <td className={`px-4 py-2 text-right num ${critico ? "font-semibold text-warn" : "text-ink"}`}>
                      {p.estoque_atual ?? 0}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {/* "Cadastrar Valor mínimo" do Bubble, inline na listagem */}
                      <form action={salvarValorMinimo} className="flex items-center justify-end gap-1">
                        <input type="hidden" name="id" value={p.id} />
                        <input
                          type="number"
                          name="quantidade_minima"
                          min={0}
                          defaultValue={p.quantidade_minima ?? ""}
                          className="w-16 rounded border border-line bg-surface px-1 py-0.5 text-right text-xs num"
                          aria-label={`Valor mínimo de ${p.nome}`}
                        />
                        <button type="submit" className="rounded border border-line px-1.5 py-0.5 text-[11px] hover:bg-surface">
                          Salvar
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-2 text-ink">{formatData(p.created_at)}</td>
                    <td className="px-4 py-2 text-right num text-ink">
                      {formatBRL((p.valor ?? 0) * (p.estoque_atual ?? 0))}
                    </td>
                    <td className="px-4 py-2 text-ink">{p.status_produto}</td>
                    <td className="px-4 py-2 text-center">
                      {/* Corrida do despacho automático (0043) nasce marcada "requer revisão"
                          quando o pedido inclui um produto assim marcado (0051). */}
                      <form action={atualizarParceiroLogisticoHabilitado}>
                        <input type="hidden" name="id" value={p.id} />
                        <input
                          type="hidden"
                          name="parceiro_logistico_habilitado"
                          value={(!p.parceiro_logistico_habilitado).toString()}
                        />
                        <button
                          type="submit"
                          aria-pressed={p.parceiro_logistico_habilitado}
                          title="Corrida exige revisão do afiliado logístico antes de aceitar"
                          className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${
                            p.parceiro_logistico_habilitado
                              ? "border-laranja bg-laranja/10 text-laranja-escuro"
                              : "border-line text-muted hover:bg-surface"
                          }`}
                        >
                          {p.parceiro_logistico_habilitado ? "Ativo" : "Inativo"}
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <form action={excluirProduto}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="rounded border border-line px-2 py-1 text-[11px] font-semibold text-warn hover:bg-surface"
                        >
                          Excluir
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
