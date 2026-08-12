import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, EmptyState, fmtBRL } from "@/components/admin/ui";
import { precoLote, type Lote } from "@/lib/coletiva";

export const dynamic = "force-dynamic";

type Linha = {
  id: string;
  meta_qtd: number;
  qtd_atual: number;
  valor_unitario: number;
  preco_base: number;
  prazo: string;
  status: string;
  created_at: string;
  lotes: Lote[] | null;
  min_participantes: number;
  max_participantes: number | null;
  produtos: { nome: string } | null;
  lojas: { nome: string } | null;
  coletiva_participacoes: { id: string; pedido_id: string | null }[] | null;
};

// Auditoria das compras coletivas do marketplace (MPDD-36 v2). O admin
// acompanha e cancela; a configuração por produto é do seller (0076).
export default async function AdminColetivasPage() {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("compras_coletivas")
    .select(
      "id, meta_qtd, qtd_atual, valor_unitario, preco_base, prazo, status, created_at, lotes, min_participantes, max_participantes, produtos(nome), lojas(nome), coletiva_participacoes(id, pedido_id)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return <ErrorState title="Falha ao carregar coletivas" detail={error.message} />;
  }

  const coletivas = (data ?? []) as Linha[];
  const abertas = coletivas.filter((c) => c.status === "Aberta" || c.status === "Viavel");
  const fechadas = coletivas.filter((c) => c.status === "Atingida");
  const volumeFechado = fechadas.reduce(
    (s, c) => s + Number(c.valor_unitario) * c.qtd_atual,
    0,
  );

  return (
    <div>
      <PageHeader
        title="Compras coletivas"
        subtitle="Todas as coletivas do marketplace. A configuração de metas e lotes é feita pelo seller no painel dele."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-line bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Em andamento</p>
          <p className="num text-2xl font-semibold text-ink">{abertas.length}</p>
        </div>
        <div className="rounded border border-line bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Fechadas</p>
          <p className="num text-2xl font-semibold text-ink">{fechadas.length}</p>
        </div>
        <div className="rounded border border-line bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Volume fechado</p>
          <p className="num text-2xl font-semibold text-ink">{fmtBRL(volumeFechado)}</p>
        </div>
      </div>

      {coletivas.length === 0 ? (
        <EmptyState>Nenhuma compra coletiva registrada.</EmptyState>
      ) : (
        <Table
          headers={[
            "Produto",
            "Loja",
            "Progresso",
            "Preço atual",
            "Participantes",
            "Pedidos",
            "Prazo",
            "Status",
          ]}
        >
          {coletivas.map((c) => {
            const lotes = Array.isArray(c.lotes) ? c.lotes : [];
            const participacoes = c.coletiva_participacoes ?? [];
            const atual = lotes.length
              ? precoLote(lotes, c.qtd_atual, Number(c.preco_base))
              : Number(c.valor_unitario);
            const emAndamento = c.status === "Aberta" || c.status === "Viavel";
            const status =
              emAndamento && new Date(c.prazo) < new Date()
                ? "Expirada"
                : c.status === "Viavel"
                  ? "Meta batida"
                  : c.status;
            return (
              <tr key={c.id} className="border-t border-line">
                <td className="px-4 py-2 text-ink">
                  <a href={`/coletiva/${c.id}`} className="hover:underline">
                    {c.produtos?.nome ?? "—"}
                  </a>
                </td>
                <td className="px-4 py-2 text-ink">{c.lojas?.nome ?? "—"}</td>
                <td className="num px-4 py-2 text-ink">
                  {c.qtd_atual}/{c.meta_qtd} un
                </td>
                <td className="num px-4 py-2 text-ink">
                  {fmtBRL(atual)}{" "}
                  <span className="text-muted line-through">{fmtBRL(c.preco_base)}</span>
                </td>
                <td className="num px-4 py-2 text-ink">
                  {participacoes.length}
                  {c.max_participantes ? `/${c.max_participantes}` : ""}
                </td>
                <td className="num px-4 py-2 text-ink">
                  {participacoes.filter((p) => p.pedido_id).length}
                </td>
                <td className="num px-4 py-2 text-ink">
                  {new Date(c.prazo).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-2 text-ink">{status}</td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
