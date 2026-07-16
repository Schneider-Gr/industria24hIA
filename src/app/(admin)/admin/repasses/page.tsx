import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState, fmtBRL } from "@/components/admin/ui";
import { retentarRepasseAction } from "./actions";

export const dynamic = "force-dynamic";

type Repasse = {
  id: string;
  pedido_id: string;
  destino: string;
  chave_pix: string | null;
  tipo_chave_pix: string | null;
  valor: number;
  status: string;
  asaas_transfer_id: string | null;
  erro: string | null;
  criado_em: string;
  transferido_em: string | null;
};

// Ledger de repasses PIX (migration 0058). O webhook Asaas transfere
// automaticamente; aqui o admin vê tudo e re-tenta os falhou/inelegivel.
export default async function RepassesPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();
  // Tabela da 0058, fora do database.types.ts gerado.
  const { data, error } = await (supabase as unknown as {
    from(t: string): {
      select(c: string): {
        order(col: string, opts: { ascending: boolean }): {
          limit(n: number): Promise<{ data: Repasse[] | null; error: { message: string } | null }>;
        };
      };
    };
  })
    .from("repasses")
    .select(
      "id, pedido_id, destino, chave_pix, tipo_chave_pix, valor, status, asaas_transfer_id, erro, criado_em, transferido_em",
    )
    .order("criado_em", { ascending: false })
    .limit(300);

  if (error) {
    return <ErrorState title="Falha ao carregar repasses" detail={error.message} />;
  }

  const repasses = data ?? [];
  const problemas = repasses.filter((r) => r.status === "falhou" || r.status === "inelegivel");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Repasses PIX"
        subtitle="Transferências automáticas para sellers e afiliados (webhook Asaas)"
      />

      {problemas.length > 0 && (
        <p className="rounded-sm border border-borda bg-white p-3 text-sm">
          <strong>{problemas.length}</strong> repasse(s) precisam de ação: chave PIX
          ausente/em carência ou transferência com erro. Corrigida a causa, use
          &quot;Re-tentar&quot;.
        </p>
      )}

      {repasses.length === 0 ? (
        <EmptyState>Nenhum repasse gerado ainda.</EmptyState>
      ) : (
        <Table headers={["Criado", "Pedido", "Destino", "Chave PIX", "Valor", "Status", "Erro", "Ação"]}>
          {repasses.map((r) => (
            <tr key={r.id}>
              <td className="py-[9px] px-3 text-xs">
                {new Date(r.criado_em).toLocaleString("pt-BR")}
              </td>
              <td className="py-[9px] px-3 font-mono text-xs">{r.pedido_id.slice(0, 8)}</td>
              <td className="py-[9px] px-3">{r.destino === "seller" ? "Loja" : "Afiliado"}</td>
              <td className="py-[9px] px-3 text-xs">
                {r.chave_pix ?? "—"}
                {r.tipo_chave_pix ? ` (${r.tipo_chave_pix})` : ""}
              </td>
              <td className="py-[9px] px-3 text-right num font-semibold">{fmtBRL(r.valor)}</td>
              <td className="py-[9px] px-3">
                <StatusBadge status={r.status} />
                {r.asaas_transfer_id && (
                  <span className="ml-1 font-mono text-[10px] text-muted">
                    {r.asaas_transfer_id}
                  </span>
                )}
              </td>
              <td className="py-[9px] px-3 max-w-[220px] truncate text-xs" title={r.erro ?? undefined}>
                {r.erro ?? "—"}
              </td>
              <td className="py-[9px] px-3">
                {(r.status === "falhou" || r.status === "inelegivel") && (
                  <form action={retentarRepasseAction}>
                    <input type="hidden" name="repasse_id" value={r.id} />
                    <button
                      type="submit"
                      className="rounded border border-line px-2 py-1 text-[11px] font-semibold hover:bg-surface"
                    >
                      Re-tentar
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
