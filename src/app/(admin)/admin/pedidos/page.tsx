import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState, fmtBRL, fmtDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();
  // TODO: requer policy is_admin (RLS atual escopa por dono da loja).
  const { data, error } = await supabase
    .from("pedidos")
    .select("id, id_venda, cliente_nome, data, status_pedido, valor_pedido")
    .order("data", { ascending: false })
    .limit(500);

  if (error) {
    return <ErrorState title="Falha ao carregar pedidos" detail={error.message} />;
  }

  const pedidos = data ?? [];
  const ids = pedidos.map((p) => p.id);
  const { data: itensData } = ids.length
    ? await supabase
        .from("linha_itens")
        .select("pedido_id, quantidade, repasse_ind")
        .in("pedido_id", ids)
    : { data: [] as { pedido_id: string; quantidade: number; repasse_ind: number }[] };

  const agg = new Map<string, { itens: number; repasse: number }>();
  for (const it of itensData ?? []) {
    const cur = agg.get(it.pedido_id) ?? { itens: 0, repasse: 0 };
    cur.itens += it.quantidade ?? 0;
    cur.repasse += it.repasse_ind ?? 0;
    agg.set(it.pedido_id, cur);
  }

  return (
    <div>
      <PageHeader
        title="Pedidos"
        subtitle="Todos os pedidos e status de pagamento"
        count={pedidos.length}
      />

      {pedidos.length === 0 ? (
        <EmptyState>
          Nenhum pedido visível. A leitura cross-seller do admin depende da
          policy is_admin.
        </EmptyState>
      ) : (
        <Table
          headers={["ID", "Comprador", "Data", "Total itens", "Valor", "Repasse Ind", "Status"]}
        >
          {pedidos.map((p) => {
            const a = agg.get(p.id) ?? { itens: 0, repasse: 0 };
            return (
              <tr key={p.id} className="text-neutral-700 dark:text-neutral-200">
                <td className="px-4 py-3 font-mono text-xs">{p.id_venda}</td>
                <td className="px-4 py-3">{p.cliente_nome ?? "—"}</td>
                <td className="px-4 py-3">{fmtDate(p.data)}</td>
                <td className="px-4 py-3">{a.itens}</td>
                <td className="px-4 py-3 font-medium">{fmtBRL(p.valor_pedido)}</td>
                <td className="px-4 py-3 text-neutral-500">{fmtBRL(a.repasse)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status_pedido} />
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
