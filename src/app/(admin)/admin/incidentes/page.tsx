import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState, fmtDate } from "@/components/admin/ui";
import { marcarIncidenteResolvido } from "./actions";

export const dynamic = "force-dynamic";

// Tipo manual: `incidentes_atendimento` (migration 0131) ainda fora de
// database.types.ts, mesmo motivo documentado em src/lib/ai/botDb.ts.
type Incidente = {
  id: string;
  conversa_id: string;
  resumo: string;
  status: "aberto" | "resolvido";
  jira_issue_key: string | null;
  created_at: string;
};

interface ClientComIncidentes {
  from(table: "incidentes_atendimento"): {
    select(cols: string): {
      order(col: string, opts: { ascending: boolean }): Promise<{ data: Incidente[] | null; error: { message: string } | null }>;
    };
  };
}

// Espelho de auditoria do escalonamento humano do bot (spec #311) — nasce
// independente do Jira ter funcionado (ver src/lib/ai/atendimento.ts), por
// isso esta tela é a única garantia de visibilidade quando o Jira falhar.
export default async function IncidentesPage() {
  if (!isSupabaseConfigured) {
    return <ErrorState title="Supabase não configurado" detail="Defina as variáveis do Supabase em web/.env.local." />;
  }

  const supabase = await createClient();
  const { data, error } = await (supabase as unknown as ClientComIncidentes)
    .from("incidentes_atendimento")
    .select("id, conversa_id, resumo, status, jira_issue_key, created_at")
    .order("created_at", { ascending: false });

  if (error) return <ErrorState title="Falha ao carregar incidentes" detail={error.message} />;

  const incidentes = data ?? [];

  return (
    <div>
      <PageHeader title="Incidentes de atendimento" subtitle="Escalonamentos do bot para humano" count={incidentes.length} />

      {incidentes.length === 0 ? (
        <EmptyState>Nenhum incidente registrado.</EmptyState>
      ) : (
        <Table headers={["Resumo", "Data", "Jira", "Status", "Ação"]}>
          {incidentes.map((i) => (
            <tr key={i.id} className="align-top text-ink dark:text-ink-2">
              <td className="px-4 py-3">{i.resumo}</td>
              <td className="px-4 py-3">{fmtDate(i.created_at)}</td>
              <td className="px-4 py-3">
                {i.jira_issue_key ?? <span className="text-ink-2">— (Jira indisponível na abertura)</span>}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={i.status} />
              </td>
              <td className="px-4 py-3">
                {i.status === "aberto" && (
                  <form action={marcarIncidenteResolvido}>
                    <input type="hidden" name="id" value={i.id} />
                    <button type="submit" className="text-xs font-semibold text-aco-600 hover:underline">
                      Marcar resolvido
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
