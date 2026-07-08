import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState, fmtDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function PromocoesPage() {
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
    .from("promocoes_progressivas")
    .select("id, produto_id, faixas, ativo, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return <ErrorState title="Falha ao carregar promoções" detail={error.message} />;
  }

  const promos = data ?? [];
  const produtoIds = [...new Set(promos.map((p) => p.produto_id))];
  const { data: prodData } = produtoIds.length
    ? await supabase.from("produtos").select("id, nome").in("id", produtoIds)
    : { data: [] as { id: string; nome: string }[] };
  const prodNome = new Map((prodData ?? []).map((p) => [p.id, p.nome]));

  return (
    <div>
      <PageHeader
        title="Promoções"
        subtitle="Promoções progressivas por produto"
        count={promos.length}
      />

      {promos.length === 0 ? (
        <EmptyState>Nenhuma promoção cadastrada visível.</EmptyState>
      ) : (
        <Table headers={["Produto", "Faixas", "Ativo", "Criada em"]}>
          {promos.map((p) => {
            const nFaixas = Array.isArray(p.faixas) ? p.faixas.length : 0;
            return (
              <tr key={p.id} className="text-ink">
                <td className="px-4 py-3">{prodNome.get(p.produto_id) ?? "—"}</td>
                <td className="px-4 py-3 text-right num">{nFaixas} faixa(s)</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.ativo ? "Ativa" : "Inativa"} />
                </td>
                <td className="px-4 py-3">{fmtDate(p.created_at)}</td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
