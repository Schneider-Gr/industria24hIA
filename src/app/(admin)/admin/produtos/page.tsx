import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState, fmtBRL, fmtDate } from "@/components/admin/ui";
import { ModerarStatusProduto } from "@/components/admin/ModerarStatusProduto";

export const dynamic = "force-dynamic";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const { status: filtroStatus } = await searchParams;
  const supabase = await createClient();
  // Leitura cross-seller garantida pela policy is_admin (migration 0004).
  let query = supabase
    .from("produtos")
    .select("id, nome, valor, estoque_atual, status_produto, loja_id, created_at")
    .order("created_at", { ascending: false });
  if (filtroStatus) query = query.eq("status_produto", filtroStatus);
  const { data, error } = await query;

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
        subtitle={filtroStatus ? `Filtro: status = ${filtroStatus}` : "Aprovação de produtos (cross-seller)"}
        count={produtos.length}
      />

      {produtos.length === 0 ? (
        <EmptyState>
          Nenhum produto cadastrado.
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
            "",
            "Moderação",
          ]}
        >
          {produtos.map((p) => (
            <tr key={p.id} className="text-ink dark:text-ink-2">
              <td className="px-4 py-2 font-medium">{p.nome}</td>
              <td className="px-4 py-2 text-ink-2">{lojaNome.get(p.loja_id) ?? "—"}</td>
              <td className="px-4 py-2 text-right num font-semibold">{fmtBRL(p.valor)}</td>
              <td className="px-4 py-2 text-right num">{p.estoque_atual}</td>
              <td className="px-4 py-2 text-ink-2">{fmtDate(p.created_at)}</td>
              <td className="px-4 py-2">
                <StatusBadge status={p.status_produto} />
              </td>
              <td className="px-4 py-2">
                <Link
                  href={`/admin/produtos/${p.id}`}
                  className="text-xs font-semibold text-aco-600 hover:underline"
                >
                  Ver
                </Link>
              </td>
              <td className="px-4 py-2">
                <ModerarStatusProduto id={p.id} status={p.status_produto} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
