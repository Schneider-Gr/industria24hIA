import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState, fmtDate } from "@/components/admin/ui";
import { setStatusLead } from "./actions";

export const dynamic = "force-dynamic";

const STATUS = ["novo", "em_contato", "convertido", "descartado"] as const;

// Tipos manuais: `leads` (migration 0088) ainda fora de database.types.ts,
// mesmo motivo documentado em src/lib/ai/botDb.ts.
type Lead = {
  id: string;
  nome: string | null;
  contato: string;
  interesse: string | null;
  status: string;
  created_at: string;
};
interface ClientComLeads {
  from(table: "leads"): {
    select(cols: string): {
      order(col: string, opts: { ascending: boolean }): Promise<{ data: Lead[] | null; error: { message: string } | null }>;
    };
  };
}

export default async function LeadsPage() {
  if (!isSupabaseConfigured) {
    return <ErrorState title="Supabase não configurado" detail="Defina as variáveis do Supabase em web/.env.local." />;
  }

  const supabase = (await createClient()) as unknown as ClientComLeads;
  const { data, error } = await supabase
    .from("leads")
    .select("id, nome, contato, interesse, status, created_at")
    .order("created_at", { ascending: false });

  if (error) return <ErrorState title="Falha ao carregar leads" detail={error.message} />;

  const leads = data ?? [];

  return (
    <div>
      <PageHeader title="Leads" subtitle="Contatos capturados pelo bot de atendimento" count={leads.length} />

      {leads.length === 0 ? (
        <EmptyState>Nenhum lead registrado ainda.</EmptyState>
      ) : (
        <Table headers={["Nome", "Contato", "Interesse", "Data", "Status", "Mudar status"]}>
          {leads.map((l) => (
            <tr key={l.id} className="text-ink dark:text-ink-2">
              <td className="px-4 py-3 font-medium">{l.nome ?? "—"}</td>
              <td className="px-4 py-3">{l.contato}</td>
              <td className="px-4 py-3">{l.interesse ?? "—"}</td>
              <td className="px-4 py-3">{fmtDate(l.created_at)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={l.status} />
              </td>
              <td className="px-4 py-3">
                <form action={setStatusLead} className="flex gap-2">
                  <input type="hidden" name="id" value={l.id} />
                  <select
                    name="status"
                    defaultValue={l.status}
                    className="rounded border border-line px-2 py-1 text-xs"
                  >
                    {STATUS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="text-xs font-semibold text-aco-600 hover:underline">
                    Salvar
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
