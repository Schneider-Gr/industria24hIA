import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/seller/KpiCard";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { ProdutoForm } from "@/components/seller/ProdutoForm";
import { formatBRL } from "@/components/seller/format";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();

  const [produtosRes, categoriasRes, subcategoriasRes, centrosRes] = await Promise.all([
    supabase
      .from("produtos")
      .select("id, nome, valor, estoque_atual, quantidade_minima, sku, status_produto")
      .eq("loja_id", loja.id)
      .order("created_at", { ascending: false }),
    supabase.from("categorias").select("id, nome").order("nome"),
    supabase.from("subcategorias").select("id, nome, categoria_id").order("nome"),
    supabase.from("centros_distribuicao").select("*").eq("loja_id", loja.id),
  ]);

  if (produtosRes.error) {
    return <ErrorState title="Falha ao carregar produtos" detail={produtosRes.error.message} />;
  }

  const produtos = produtosRes.data ?? [];
  const valorEstoque = produtos.reduce(
    (s, p) => s + (p.valor ?? 0) * (p.estoque_atual ?? 0),
    0,
  );
  const criticos = produtos.filter(
    (p) => p.quantidade_minima != null && (p.estoque_atual ?? 0) < p.quantidade_minima,
  ).length;

  return (
    <div>
      <PageTitle title="Produtos" subtitle="Gerencie o catálogo da sua loja" />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total de produtos" value={produtos.length} />
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

      {produtos.length === 0 ? (
        <VazioBox>Nenhum produto cadastrado. Use &quot;Cadastrar Novo&quot; acima.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-left dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-2 font-medium">Produto</th>
                <th className="px-4 py-2 font-medium">SKU</th>
                <th className="px-4 py-2 text-right font-medium">Valor</th>
                <th className="px-4 py-2 text-right font-medium">Estoque</th>
                <th className="px-4 py-2 text-right font-medium">Mínimo</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => {
                const critico =
                  p.quantidade_minima != null && (p.estoque_atual ?? 0) < p.quantidade_minima;
                return (
                  <tr key={p.id} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-4 py-2">{p.nome}</td>
                    <td className="px-4 py-2 font-mono text-xs">{p.sku ?? "—"}</td>
                    <td className="px-4 py-2 text-right">{formatBRL(p.valor)}</td>
                    <td className={`px-4 py-2 text-right ${critico ? "font-medium text-amber-600" : ""}`}>
                      {p.estoque_atual ?? 0}
                    </td>
                    <td className="px-4 py-2 text-right">{p.quantidade_minima ?? "—"}</td>
                    <td className="px-4 py-2">{p.status_produto}</td>
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
