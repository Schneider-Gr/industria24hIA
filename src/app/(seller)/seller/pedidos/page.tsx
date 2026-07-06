import { getUser, getMinhaLoja } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/ErrorState";
import { PageTitle, PrecisaLogin, SemLoja, VazioBox } from "@/components/seller/states";
import { formatBRL, formatData } from "@/components/seller/format";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const user = await getUser();
  if (!user) return <PrecisaLogin />;

  const loja = await getMinhaLoja();
  if (!loja) return <SemLoja />;

  const supabase = await createClient();
  const { data: pedidos, error } = await supabase
    .from("pedidos")
    .select("id, id_venda, cliente_nome, data, status_pedido, valor_pedido")
    .eq("loja_id", loja.id)
    .order("data", { ascending: false });

  if (error) {
    return <ErrorState title="Falha ao carregar pedidos" detail={error.message} />;
  }

  const lista = pedidos ?? [];

  // Linhas dos pedidos, para os contadores de quantidade/transferido/entregue.
  // Relação não tipada no schema gerado -> segunda query em vez de nested select.
  const ids = lista.map((p) => p.id);
  const { data: itens } = ids.length
    ? await supabase
        .from("linha_itens")
        .select("pedido_id, quantidade, transferido, entregue")
        .in("pedido_id", ids)
    : { data: [] };

  const porPedido = new Map<
    string,
    { qtd: number; total: number; transf: number; entreg: number }
  >();
  for (const it of itens ?? []) {
    const agg = porPedido.get(it.pedido_id) ?? {
      qtd: 0,
      total: 0,
      transf: 0,
      entreg: 0,
    };
    agg.qtd += it.quantidade ?? 0;
    agg.total += 1;
    if (it.transferido) agg.transf += 1;
    if (it.entregue) agg.entreg += 1;
    porPedido.set(it.pedido_id, agg);
  }

  return (
    <div>
      <PageTitle title="Pedidos" subtitle="Todos os pedidos da sua loja" />

      {lista.length === 0 ? (
        <VazioBox>Nenhum pedido registrado ainda.</VazioBox>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-left dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-2 font-medium">Id Venda</th>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 text-right font-medium">Qtd</th>
                <th className="px-4 py-2 font-medium">Status Pedido</th>
                <th className="px-4 py-2 font-medium">Transferidos</th>
                <th className="px-4 py-2 font-medium">Entregues</th>
                <th className="px-4 py-2 text-right font-medium">Valor Pedido</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const agg = porPedido.get(p.id);
                return (
                  <tr key={p.id} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-4 py-2 font-mono text-xs">{p.id_venda}</td>
                    <td className="px-4 py-2">{p.cliente_nome ?? "—"}</td>
                    <td className="px-4 py-2">{formatData(p.data)}</td>
                    <td className="px-4 py-2 text-right">{agg?.qtd ?? 0}</td>
                    <td className="px-4 py-2">{p.status_pedido}</td>
                    <td className="px-4 py-2">
                      {agg ? `${agg.transf} de ${agg.total}` : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {agg ? `${agg.entreg} de ${agg.total}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">{formatBRL(p.valor_pedido)}</td>
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
