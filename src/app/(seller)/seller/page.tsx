import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { KpiCard } from "@/components/seller/KpiCard";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatBRL, formatData } from "@/components/seller/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pedidos")
    .select("id, id_venda, cliente_nome, data, status_pedido, valor_pedido")
    .eq("loja_id", loja.id)
    .order("data", { ascending: false })
    .limit(10);

  if (error) {
    return <ErrorState title="Falha ao carregar pedidos" detail={error.message} />;
  }

  const pedidos = data ?? [];
  const total = pedidos.reduce((s, p) => s + (p.valor_pedido ?? 0), 0);
  const pagos = pedidos.filter((p) =>
    (p.status_pedido ?? "").toLowerCase().includes("realizado"),
  ).length;

  return (
    <div>
      <PageTitle title={`Loja ${loja.nome}`} subtitle="Visão geral dos seus pedidos" />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Pedidos (recentes)" value={pedidos.length} />
        <KpiCard label="Valor dos pedidos" value={formatBRL(total)} />
        <KpiCard label="Pagamentos realizados" value={pagos} />
      </div>

      <h2 className="mb-3 text-lg font-medium">Últimos pedidos</h2>
      {pedidos.length === 0 ? (
        <VazioBox>Nenhum pedido registrado ainda.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-left dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-2 font-medium">Id Venda</th>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id} className="border-t border-neutral-200 dark:border-neutral-800">
                  <td className="px-4 py-2 font-mono text-xs">{p.id_venda}</td>
                  <td className="px-4 py-2">{p.cliente_nome ?? "—"}</td>
                  <td className="px-4 py-2">{formatData(p.data)}</td>
                  <td className="px-4 py-2">{p.status_pedido}</td>
                  <td className="px-4 py-2 text-right">{formatBRL(p.valor_pedido)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
