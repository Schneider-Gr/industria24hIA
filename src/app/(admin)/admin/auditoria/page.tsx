import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, EmptyState, fmtDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

// Trilha de auditoria geral (auditoria_eventos, 0034/0035) — só super_admin
// vê: um moderador não precisa enxergar decisões financeiras de outro admin.
export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ acao?: string; tabela?: string }>;
}) {
  if (!(await isSuperAdmin())) redirect("/admin");

  const { acao, tabela } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("auditoria_eventos")
    .select("id, ator_id, ator_papel, acao, tabela, registro_id, dados_depois, criado_em")
    .order("criado_em", { ascending: false })
    .limit(300);
  if (acao) query = query.eq("acao", acao);
  if (tabela) query = query.eq("tabela", tabela);

  const { data, error } = await query;
  if (error) {
    return <ErrorState title="Falha ao carregar auditoria" detail={error.message} />;
  }

  const eventos = data ?? [];

  return (
    <div>
      <PageHeader title="Auditoria" subtitle="Trilha de ações administrativas sensíveis" count={eventos.length} />

      {eventos.length === 0 ? (
        <EmptyState>Nenhum evento registrado.</EmptyState>
      ) : (
        <Table headers={["Quando", "Ação", "Tabela", "Registro", "Papel", "Detalhes"]}>
          {eventos.map((e) => (
            <tr key={e.id} className="text-ink dark:text-ink-2">
              <td className="px-4 py-3 text-xs">{fmtDate(e.criado_em)}</td>
              <td className="px-4 py-3 font-mono text-xs">{e.acao}</td>
              <td className="px-4 py-3 text-xs">{e.tabela}</td>
              <td className="px-4 py-3 font-mono text-xs">{e.registro_id ?? "—"}</td>
              <td className="px-4 py-3 text-xs">{e.ator_papel}</td>
              <td className="px-4 py-3 text-xs text-ink-2">
                {e.dados_depois ? JSON.stringify(e.dados_depois) : "—"}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
