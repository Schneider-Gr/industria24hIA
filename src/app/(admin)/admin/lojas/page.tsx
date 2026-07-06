import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState, fmtDate } from "@/components/admin/ui";
import { ModerarSituacaoLoja } from "@/components/admin/ModerarSituacaoLoja";

export const dynamic = "force-dynamic";

export default async function LojasPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();
  // TODO: requer policy is_admin (hoje a RLS escopa por owner_id).
  const { data, error } = await supabase
    .from("lojas")
    .select("id, nome, email, owner_id, situacao, cidade, estado, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return <ErrorState title="Falha ao carregar lojas" detail={error.message} />;
  }

  const lojas = data ?? [];

  return (
    <div>
      <PageHeader
        title="Lojas"
        subtitle="Todas as lojas e o fluxo de aprovação"
        count={lojas.length}
      />

      {lojas.length === 0 ? (
        <EmptyState>
          Nenhuma loja visível. Com a RLS escopada ao dono, o admin só verá
          cross-seller após a policy is_admin.
        </EmptyState>
      ) : (
        <Table
          headers={[
            "Nome",
            "Data criação",
            "E-mail",
            "Proprietário",
            "Local",
            "Situação",
            "Moderação",
          ]}
        >
          {lojas.map((l) => (
            <tr key={l.id} className="text-neutral-700 dark:text-neutral-200">
              <td className="px-4 py-3 font-medium">{l.nome}</td>
              <td className="px-4 py-3">{fmtDate(l.created_at)}</td>
              <td className="px-4 py-3">{l.email ?? "—"}</td>
              <td className="px-4 py-3 font-mono text-xs">{l.owner_id}</td>
              <td className="px-4 py-3">
                {[l.cidade, l.estado].filter(Boolean).join("/") || "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={l.situacao} />
              </td>
              <td className="px-4 py-3">
                <ModerarSituacaoLoja id={l.id} situacao={l.situacao} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
