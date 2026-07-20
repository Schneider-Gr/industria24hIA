import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState } from "@/components/admin/ui";
import { setStatusAfiliacao } from "./actions";

export const dynamic = "force-dynamic";

export default async function AfiliadosPage() {
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
    .from("afiliacoes")
    .select("id, identificador, produto_id, porcentagem, status, afiliado_id, tipo, termos_aceitos_em")
    .order("created_at", { ascending: false });

  if (error) {
    return <ErrorState title="Falha ao carregar afiliados" detail={error.message} />;
  }

  const afiliacoes = data ?? [];
  const produtoIds = [...new Set(afiliacoes.map((a) => a.produto_id).filter((id): id is string => id !== null))];
  const { data: prodData } = produtoIds.length
    ? await supabase.from("produtos").select("id, nome").in("id", produtoIds)
    : { data: [] as { id: string; nome: string }[] };
  const prodNome = new Map((prodData ?? []).map((p) => [p.id, p.nome]));

  return (
    <div>
      <PageHeader
        title="Afiliados"
        subtitle="Afiliações de produtos e habilitação"
        count={afiliacoes.length}
      />

      {afiliacoes.length === 0 ? (
        <EmptyState>
          Nenhuma afiliação registrada.
        </EmptyState>
      ) : (
        <Table
          headers={["Identificador", "Tipo", "Produto", "Comissão", "Status", "Termos", "Ação"]}
        >
          {afiliacoes.map((a) => {
            // Vocabulário do CHECK do banco: Pendente | Aprovada | Suspensa.
            const aprovada = a.status === "Aprovada";
            return (
              <tr key={a.id} className="text-ink dark:text-ink-2">
                <td className="px-4 py-3 font-mono text-xs">
                  {a.identificador ?? "—"}
                </td>
                <td className="px-4 py-3">{a.tipo === "logistica" ? "Logística" : "Vendas"}</td>
                <td className="px-4 py-3">{(a.produto_id && prodNome.get(a.produto_id)) ?? "—"}</td>
                <td className="px-4 py-3 text-right num font-semibold">{a.porcentagem}%</td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} />
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {a.termos_aceitos_em
                    ? new Date(a.termos_aceitos_em).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <form action={setStatusAfiliacao}>
                    <input type="hidden" name="id" value={a.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={aprovada ? "Suspensa" : "Aprovada"}
                    />
                    <button
                      type="submit"
                      className={`rounded px-2 py-1 text-xs font-semibold text-white transition-colors ${
                        aprovada
                          ? "bg-muted hover:bg-ink-2"
                          : "bg-ok hover:bg-ok/90"
                      }`}
                    >
                      {aprovada ? "Suspender" : "Aprovar"}
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
