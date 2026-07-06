import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState, fmtBRL, fmtDate } from "@/components/admin/ui";
import { ModerarStatusProduto } from "@/components/admin/ModerarStatusProduto";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
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
    .from("produtos")
    .select("id, nome, valor, estoque_atual, status_produto, loja_id, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return <ErrorState title="Falha ao carregar produtos" detail={error.message} />;
  }

  const produtos = data ?? [];
  const lojaIds = [...new Set(produtos.map((p) => p.loja_id))];
  const { data: lojasData } = lojaIds.length
    ? await supabase.from("lojas").select("id, nome").in("id", lojaIds)
    : { data: [] as { id: string; nome: string }[] };
  const lojaNome = new Map((lojasData ?? []).map((l) => [l.id, l.nome]));

  return (
    <div>
      <PageHeader
        title="Produtos"
        subtitle="Aprovação de produtos (cross-seller)"
        count={produtos.length}
      />

      {produtos.length === 0 ? (
        <EmptyState>
          Nenhum produto visível. A leitura cross-seller do admin depende da
          policy is_admin.
        </EmptyState>
      ) : (
        <Table
          headers={[
            "Nome",
            "Vendedor",
            "Valor",
            "Estoque",
            "Data",
            "Status",
            "Moderação",
          ]}
        >
          {produtos.map((p) => (
            <tr key={p.id} className="text-neutral-700 dark:text-neutral-200">
              <td className="px-4 py-3 font-medium">{p.nome}</td>
              <td className="px-4 py-3">{lojaNome.get(p.loja_id) ?? "—"}</td>
              <td className="px-4 py-3">{fmtBRL(p.valor)}</td>
              <td className="px-4 py-3">{p.estoque_atual}</td>
              <td className="px-4 py-3">{fmtDate(p.created_at)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={p.status_produto} />
              </td>
              <td className="px-4 py-3">
                <ModerarStatusProduto id={p.id} status={p.status_produto} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
