import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/seller/KpiCard";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatBRL, formatData } from "@/components/seller/format";
import { fetchAll } from "@/lib/supabase/fetch-all";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  // KPIs sobre TODOS os pedidos da loja; a tabela mostra só os 10 últimos.
  const { data: todos, error } = await fetchAll((from, to) =>
    supabase
      .from("pedidos")
      .select("id, id_venda, cliente_nome, data, status_pedido, valor_pedido")
      .eq("loja_id", loja.id)
      .order("data", { ascending: false })
      .range(from, to),
  );

  if (error) {
    return <ErrorState title="Falha ao carregar pedidos" detail={error.message} />;
  }

  const pedidos = todos.slice(0, 10);
  const total = todos.reduce((s, p) => s + (p.valor_pedido ?? 0), 0);
  const pagos = todos.filter((p) =>
    (p.status_pedido ?? "").toLowerCase().includes("realizado"),
  ).length;

  return (
    <div>
      <PageTitle title={`Loja ${loja.nome}`} subtitle="Visão geral dos seus pedidos" />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Pedidos" value={todos.length} />
        <KpiCard label="Valor dos pedidos" value={formatBRL(total)} />
        <KpiCard label="Pagamentos realizados" value={pagos} />
      </div>

      <h2 className="mb-3 font-display text-24 font-semibold">Últimos pedidos</h2>
      {pedidos.length === 0 ? (
        <VazioBox>Nenhum pedido registrado ainda.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr className="border-b border-line">
                <th className="px-4 py-9px text-left text-11px uppercase tracking-wider text-muted font-semibold">Id Venda</th>
                <th className="px-4 py-9px text-left text-11px uppercase tracking-wider text-muted font-semibold">Cliente</th>
                <th className="px-4 py-9px text-left text-11px uppercase tracking-wider text-muted font-semibold">Data</th>
                <th className="px-4 py-9px text-left text-11px uppercase tracking-wider text-muted font-semibold">Status</th>
                <th className="px-4 py-9px text-right text-11px uppercase tracking-wider text-muted font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id} className="border-t border-line hover:bg-surface/50">
                  <td className="px-4 py-9px font-mono text-xs text-ink">{p.id_venda}</td>
                  <td className="px-4 py-9px text-ink">{p.cliente_nome ?? "—"}</td>
                  <td className="px-4 py-9px text-ink">{formatData(p.data)}</td>
                  <td className="px-4 py-9px text-ink">{p.status_pedido}</td>
                  <td className="px-4 py-9px text-right num font-semibold text-ink">{formatBRL(p.valor_pedido)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
