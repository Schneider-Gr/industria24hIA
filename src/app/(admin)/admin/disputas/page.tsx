import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState, fmtDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

// Fila de disputas escaladas para mediação do admin (PRD 009 US04) — mesmo
// padrão de src/app/(admin)/admin/produtos/page.tsx (filtro por status).
export default async function AdminDisputasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return <ErrorState title="Supabase não configurado" detail="Defina as variáveis do Supabase." />;
  }

  const { status: filtroStatus } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("disputas")
    .select("id, motivo, status, aberta_em, escalada_em, loja_id")
    .order("aberta_em", { ascending: false });
  query = filtroStatus ? query.eq("status", filtroStatus) : query.eq("status", "em_mediacao_admin");
  const { data, error } = await query;

  if (error) return <ErrorState title="Falha ao carregar disputas" detail={error.message} />;

  const disputas = data ?? [];
  const lojaIds = [...new Set(disputas.map((d) => d.loja_id))];
  const { data: lojasData } = lojaIds.length
    ? await supabase.from("lojas").select("id, nome").in("id", lojaIds)
    : { data: [] as { id: string; nome: string }[] };
  const lojaNome = new Map((lojasData ?? []).map((l) => [l.id, l.nome]));

  return (
    <div>
      <PageHeader
        title="Disputas"
        subtitle={filtroStatus ? `Filtro: status = ${filtroStatus}` : "Em mediação do Indústria24h"}
        count={disputas.length}
      />

      {disputas.length === 0 ? (
        <EmptyState>Nenhuma disputa em mediação.</EmptyState>
      ) : (
        <Table headers={["Motivo", "Loja", "Aberta em", "Escalada em", "Status", ""]}>
          {disputas.map((d) => (
            <tr key={d.id} className="text-ink dark:text-ink-2">
              <td className="px-4 py-2">{d.motivo}</td>
              <td className="px-4 py-2 text-ink-2">{lojaNome.get(d.loja_id) ?? "—"}</td>
              <td className="px-4 py-2 text-ink-2">{fmtDate(d.aberta_em)}</td>
              <td className="px-4 py-2 text-ink-2">{fmtDate(d.escalada_em)}</td>
              <td className="px-4 py-2">
                <StatusBadge status={d.status} />
              </td>
              <td className="px-4 py-2">
                <Link href={`/admin/disputas/${d.id}`} className="text-xs font-semibold text-aco-600 hover:underline">
                  Arbitrar
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
