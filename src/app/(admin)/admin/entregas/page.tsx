import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState, fmtBRL } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function EntregasPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();
  // Fulfillment ainda não tem tabela própria; usamos a flag `entregue` das
  // linhas de item como fonte real do estado de entrega.
  // TODO: modelar tabela de entregas/fulfillment dedicada + policy is_admin.
  const { data, error } = await supabase
    .from("linha_itens")
    .select("id, produto_nome, quantidade, valor, entregue, pedido_id")
    .order("id", { ascending: false })
    .limit(300);

  if (error) {
    return <ErrorState title="Falha ao carregar entregas" detail={error.message} />;
  }

  const itens = data ?? [];

  return (
    <div>
      <PageHeader
        title="Entregas"
        subtitle="Estado de entrega por item (via flag entregue)"
        count={itens.length}
      />

      {itens.length === 0 ? (
        <EmptyState>
          Nenhum item visível. Sem tabela de fulfillment dedicada e com a RLS
          escopada, a lista fica vazia até a policy is_admin.
        </EmptyState>
      ) : (
        <Table headers={["Item", "Qtd", "Valor", "Pedido", "Entrega"]}>
          {itens.map((it) => (
            <tr key={it.id} className="text-neutral-700 dark:text-neutral-200">
              <td className="px-4 py-3">{it.produto_nome ?? "—"}</td>
              <td className="px-4 py-3">{it.quantidade}</td>
              <td className="px-4 py-3">{fmtBRL(it.valor)}</td>
              <td className="px-4 py-3 font-mono text-xs">{it.pedido_id}</td>
              <td className="px-4 py-3">
                <StatusBadge status={it.entregue ? "Entregue" : "Pendente"} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
