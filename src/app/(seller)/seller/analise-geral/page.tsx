import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/seller/KpiCard";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatBRL, formatData } from "@/components/seller/format";
import { fetchAll, chunk } from "@/lib/supabase/fetch-all";

export const dynamic = "force-dynamic";

export default async function AnaliseGeralPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();

  // Pedidos da loja -> suas linhas de venda com repasse.
  const { data: pedidos, error: errPed } = await fetchAll((from, to) =>
    supabase
      .from("pedidos")
      .select("id, id_venda, cliente_nome, data, status_pedido")
      .eq("loja_id", loja.id)
      .range(from, to),
  );

  if (errPed) {
    return <ErrorState title="Falha ao carregar vendas" detail={errPed.message} />;
  }

  const ids = pedidos.map((p) => p.id);
  const pedidoPorId = new Map(pedidos.map((p) => [p.id, p]));
  const linhas: {
    id: string;
    pedido_id: string;
    produto_nome: string | null;
    quantidade: number | null;
    valor: number | null;
    repasse_ind: number | null;
    repasse_afiliado: number | null;
  }[] = [];
  for (const grupo of chunk(ids)) {
    const { data, error } = await fetchAll((from, to) =>
      supabase
        .from("linha_itens")
        .select("id, pedido_id, produto_nome, quantidade, valor, repasse_ind, repasse_afiliado")
        .in("pedido_id", grupo)
        .range(from, to),
    );
    if (error) {
      return <ErrorState title="Falha ao carregar vendas" detail={error.message} />;
    }
    linhas.push(...data);
  }
  const totalVendas = linhas.reduce((s, l) => s + (l.valor ?? 0), 0);
  const totalRepasse = linhas.reduce((s, l) => s + (l.repasse_ind ?? 0), 0);
  const totalUnidades = linhas.reduce((s, l) => s + (l.quantidade ?? 0), 0);

  // Top Produtos (por valor vendido), como no painel Bubble.
  const porProduto = new Map<string, { qtd: number; valor: number }>();
  for (const l of linhas) {
    const nome = l.produto_nome ?? "—";
    const agg = porProduto.get(nome) ?? { qtd: 0, valor: 0 };
    agg.qtd += l.quantidade ?? 0;
    agg.valor += l.valor ?? 0;
    porProduto.set(nome, agg);
  }
  const topProdutos = [...porProduto.entries()]
    .sort((a, b) => b[1].valor - a[1].valor)
    .slice(0, 5);

  return (
    <div>
      <PageTitle
        title="Análise Geral"
        subtitle="Vendas por item e repasse da plataforma (Repasse Ind = 5%)"
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Valor Total" value={formatBRL(totalVendas)} />
        <KpiCard label="Produtos Vendidos Geral" value={totalUnidades} />
        <KpiCard label="Repasse Indústria (5%)" value={formatBRL(totalRepasse)} />
      </div>

      {topProdutos.length > 0 && (
        <section className="mb-8 rounded border border-line bg-surface p-4">
          <h2 className="font-display mb-3 text-24 font-bold">Top Produtos</h2>
          <ol className="space-y-2">
            {topProdutos.map(([nome, agg]) => (
              <li key={nome} className="flex items-center justify-between text-sm">
                <span className="text-ink">{nome}</span>
                <span className="num text-muted">
                  {agg.qtd} un · {formatBRL(agg.valor)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <h2 className="font-display mb-3 text-24 font-bold">Vendas Geral</h2>
      {linhas.length === 0 ? (
        <VazioBox>Nenhuma venda registrada ainda.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">ID</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Cliente</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Item</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Data</th>
                <th className="px-4 py-2 uppercase text-[11px] tracking-wider text-muted font-medium">Status</th>
                <th className="px-4 py-2 text-right uppercase text-[11px] tracking-wider text-muted font-medium">Qtd</th>
                <th className="px-4 py-2 text-right uppercase text-[11px] tracking-wider text-muted font-medium">Valor</th>
                <th className="px-4 py-2 text-right uppercase text-[11px] tracking-wider text-muted font-medium">Repasse Ind</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const ped = pedidoPorId.get(l.pedido_id);
                return (
                <tr key={l.id} className="border-t border-line">
                  <td className="px-4 py-2 font-mono text-xs text-ink">{ped?.id_venda ?? "—"}</td>
                  <td className="px-4 py-2 text-ink">{ped?.cliente_nome ?? "—"}</td>
                  <td className="px-4 py-2 text-ink">{l.produto_nome ?? "—"}</td>
                  <td className="px-4 py-2 text-ink">{formatData(ped?.data)}</td>
                  <td className="px-4 py-2 text-ink">{ped?.status_pedido ?? "—"}</td>
                  <td className="px-4 py-2 text-right text-ink num">{l.quantidade ?? 0}</td>
                  <td className="px-4 py-2 text-right text-ink num font-semibold">{formatBRL(l.valor)}</td>
                  <td className="px-4 py-2 text-right text-ink num font-semibold">{formatBRL(l.repasse_ind)}</td>
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
