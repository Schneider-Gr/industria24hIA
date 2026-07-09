import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState, fmtBRL, fmtDate } from "@/components/admin/ui";
import { fetchAll, chunk } from "@/lib/supabase/fetch-all";

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
  // Leitura cross-seller garantida pela policy is_admin (migration 0004).
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
  const itensChunks = await Promise.all(
    chunk(ids).map((grupo) =>
      fetchAll((from, to) =>
        supabase
          .from("linha_itens")
          .select("pedido_id, quantidade, repasse_ind")
          .in("pedido_id", grupo)
          .range(from, to),
      ),
    ),
  );

  const agg = new Map<string, { itens: number; repasse: number }>();
  for (const it of itensChunks.flatMap((r) => r.data)) {
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
          Nenhum pedido registrado.
        </EmptyState>
      ) : (
        <Table
          headers={["ID", "Comprador", "Data", "Total itens", "Valor", "Repasse Ind", "Status"]}
        >
          {pedidos.map((p) => {
            const a = agg.get(p.id) ?? { itens: 0, repasse: 0 };
            return (
              <tr key={p.id} className="text-ink dark:text-ink-2">
                <td className="px-4 py-3 font-mono text-xs">{p.id_venda}</td>
                <td className="px-4 py-3">{p.cliente_nome ?? "—"}</td>
                <td className="px-4 py-3">{fmtDate(p.data)}</td>
                <td className="px-4 py-3 text-right num">{a.itens}</td>
                <td className="px-4 py-3 text-right num font-semibold">{fmtBRL(p.valor_pedido)}</td>
                <td className="px-4 py-3 text-right num text-muted">{fmtBRL(a.repasse)}</td>
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
