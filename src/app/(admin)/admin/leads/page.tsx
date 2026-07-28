import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState, fmtDate } from "@/components/admin/ui";
import { setStatusLead, atribuirResponsavel, registrarInteracao } from "./actions";

export const dynamic = "force-dynamic";

const STATUS = ["novo", "em_contato", "convertido", "descartado"] as const;
const PRAZO_ATRASADO_DIAS = 3; // premissa PRD 002 US03 — dias corridos, sem confirmação final do usuário

// Tipos manuais: `leads`/`lead_interacoes`/`listar_admins` (migrations
// 0088/0090) ainda fora de database.types.ts, mesmo motivo documentado em
// src/lib/ai/botDb.ts.
type Lead = {
  id: string;
  nome: string | null;
  contato: string;
  interesse: string | null;
  status: string;
  responsavel_id: string | null;
  created_at: string;
};
type Interacao = { lead_id: string; autor_id: string; conteudo: string; created_at: string };
type Admin = { user_id: string; email: string };

interface ClientComLeads {
  from(table: "leads"): {
    select(cols: string): {
      order(col: string, opts: { ascending: boolean }): Promise<{ data: Lead[] | null; error: { message: string } | null }>;
    };
  };
}
interface ClientComInteracoes {
  from(table: "lead_interacoes"): {
    select(cols: string): {
      order(col: string, opts: { ascending: boolean }): Promise<{ data: Interacao[] | null; error: { message: string } | null }>;
    };
  };
}
interface ClientComAdmins {
  rpc(fn: "listar_admins"): Promise<{ data: Admin[] | null; error: { message: string } | null }>;
}

function calcularAtrasado(lead: Lead, ultimaInteracao: string | undefined): boolean {
  if (lead.status !== "novo" && lead.status !== "em_contato") return false;
  const referencia = ultimaInteracao ?? lead.created_at;
  const dias = (Date.now() - new Date(referencia).getTime()) / 86_400_000;
  return dias > PRAZO_ATRASADO_DIAS;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ responsavel?: string; atrasado?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return <ErrorState title="Supabase não configurado" detail="Defina as variáveis do Supabase em web/.env.local." />;
  }

  const { responsavel: filtroResponsavel, atrasado: filtroAtrasado } = await searchParams;

  const supabase = await createClient();
  const [leadsRes, interacoesRes, adminsRes] = await Promise.all([
    (supabase as unknown as ClientComLeads)
      .from("leads")
      .select("id, nome, contato, interesse, status, responsavel_id, created_at")
      .order("created_at", { ascending: false }),
    (supabase as unknown as ClientComInteracoes)
      .from("lead_interacoes")
      .select("lead_id, autor_id, conteudo, created_at")
      .order("created_at", { ascending: false }),
    (supabase as unknown as ClientComAdmins).rpc("listar_admins"),
  ]);

  if (leadsRes.error) return <ErrorState title="Falha ao carregar leads" detail={leadsRes.error.message} />;

  const admins = adminsRes.data ?? [];
  const adminEmailPorId = new Map(admins.map((a) => [a.user_id, a.email]));
  const interacoesPorLead = new Map<string, Interacao[]>();
  for (const i of interacoesRes.data ?? []) {
    const lista = interacoesPorLead.get(i.lead_id) ?? [];
    lista.push(i);
    interacoesPorLead.set(i.lead_id, lista);
  }

  const leads = leadsRes.data ?? [];
  const comAtraso = leads.map((l) => ({
    lead: l,
    interacoes: interacoesPorLead.get(l.id) ?? [],
    atrasado: calcularAtrasado(l, interacoesPorLead.get(l.id)?.[0]?.created_at),
  }));

  const filtrados = comAtraso.filter(({ lead, atrasado }) => {
    if (filtroResponsavel === "sem_dono" && lead.responsavel_id) return false;
    if (filtroResponsavel && filtroResponsavel !== "sem_dono" && lead.responsavel_id !== filtroResponsavel) return false;
    if (filtroAtrasado === "1" && !atrasado) return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="Leads" subtitle="Contatos capturados pelo bot de atendimento" count={filtrados.length} />

      <form className="mb-4 flex flex-wrap gap-2 text-sm" method="get">
        <select name="responsavel" defaultValue={filtroResponsavel ?? ""} className="rounded border border-line px-2 py-1">
          <option value="">Todos os responsáveis</option>
          <option value="sem_dono">Sem dono</option>
          {admins.map((a) => (
            <option key={a.user_id} value={a.user_id}>
              {a.email}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 rounded border border-line px-2 py-1">
          <input type="checkbox" name="atrasado" value="1" defaultChecked={filtroAtrasado === "1"} />
          Só atrasados
        </label>
        <button type="submit" className="rounded bg-aco-600 px-3 py-1 font-semibold text-white">
          Filtrar
        </button>
      </form>

      {filtrados.length === 0 ? (
        <EmptyState>Nenhum lead encontrado com esse filtro.</EmptyState>
      ) : (
        <Table headers={["Nome", "Contato", "Interesse", "Data", "Status", "Responsável", "Histórico"]}>
          {filtrados.map(({ lead: l, interacoes, atrasado }) => (
            <tr key={l.id} className="align-top text-ink dark:text-ink-2">
              <td className="px-4 py-3 font-medium">
                {l.nome ?? "—"}
                {atrasado && (
                  <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                    atrasado
                  </span>
                )}
                {!l.responsavel_id && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                    sem dono
                  </span>
                )}
              </td>
              <td className="px-4 py-3">{l.contato}</td>
              <td className="px-4 py-3">{l.interesse ?? "—"}</td>
              <td className="px-4 py-3">{fmtDate(l.created_at)}</td>
              <td className="px-4 py-3">
                <form action={setStatusLead} className="flex gap-2">
                  <input type="hidden" name="id" value={l.id} />
                  <select name="status" defaultValue={l.status} className="rounded border border-line px-2 py-1 text-xs">
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
                <StatusBadge status={l.status} />
              </td>
              <td className="px-4 py-3">
                <form action={atribuirResponsavel} className="flex gap-2">
                  <input type="hidden" name="id" value={l.id} />
                  <select name="responsavel_id" defaultValue={l.responsavel_id ?? ""} className="rounded border border-line px-2 py-1 text-xs">
                    <option value="">Sem dono</option>
                    {admins.map((a) => (
                      <option key={a.user_id} value={a.user_id}>
                        {a.email}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="text-xs font-semibold text-aco-600 hover:underline">
                    Salvar
                  </button>
                </form>
              </td>
              <td className="px-4 py-3">
                <details>
                  <summary className="cursor-pointer text-xs font-semibold text-aco-600">
                    {interacoes.length} interação(ões)
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs">
                    {interacoes.map((i, idx) => (
                      <li key={idx} className="border-b border-line pb-1">
                        <span className="text-ink-2">{fmtDate(i.created_at)}</span> — {i.conteudo}
                      </li>
                    ))}
                  </ul>
                  <form action={registrarInteracao} className="mt-2 flex gap-2">
                    <input type="hidden" name="lead_id" value={l.id} />
                    <input
                      name="conteudo"
                      placeholder="Registrar nota/ligação..."
                      className="w-48 rounded border border-line px-2 py-1 text-xs"
                    />
                    <button type="submit" className="text-xs font-semibold text-aco-600 hover:underline">
                      Adicionar
                    </button>
                  </form>
                </details>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
