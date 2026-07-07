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
  // TODO: requer policy is_admin (leitura cross-seller de afiliacoes).
  const { data, error } = await supabase
    .from("afiliacoes")
    .select("id, identificador, produto_id, porcentagem, status, afiliado_id")
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
          Nenhuma afiliação visível. A leitura cross-seller depende da policy
          is_admin.
        </EmptyState>
      ) : (
        <Table
          headers={["Identificador", "Produto", "Comissão", "Status", "Ação"]}
        >
          {afiliacoes.map((a) => {
            const ativo = a.status === "ativo";
            return (
              <tr key={a.id} className="text-ink dark:text-ink-2">
                <td className="px-4 py-3 font-mono text-xs">
                  {a.identificador ?? "—"}
                </td>
                <td className="px-4 py-3">{(a.produto_id && prodNome.get(a.produto_id)) ?? "—"}</td>
                <td className="px-4 py-3 text-right num font-semibold">{a.porcentagem}%</td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.status} />
                </td>
                <td className="px-4 py-3">
                  <form action={setStatusAfiliacao}>
                    <input type="hidden" name="id" value={a.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={ativo ? "inativo" : "ativo"}
                    />
                    <button
                      type="submit"
                      className={`rounded px-2 py-1 text-xs font-semibold text-white transition-colors ${
                        ativo
                          ? "bg-muted hover:bg-ink-2"
                          : "bg-ok hover:bg-ok/90"
                      }`}
                    >
                      {ativo ? "Desabilitar" : "Habilitar"}
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
