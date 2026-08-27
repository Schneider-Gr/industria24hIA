import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState, fmtBRL, fmtDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const rotuloStatus: Record<string, string> = {
  pendente: "Pendente",
  processando: "Processando",
  transferido: "Transferido",
  falhou: "Falhou",
  inelegivel: "Inelegível",
  estornado: "Estornado",
};

// Ledger de repasses (migration 0083): visão pendente/pago por loja/afiliado.
// Populado sob demanda pelo estorno/curadoria de pedido — não há automação
// de transferência PIX aqui, é só o ledger e a leitura (escopo confirmado).
export default async function RepassesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("repasses")
    .select("id, pedido_id, destino, loja_id, afiliado_id, valor, status, criado_em, transferido_em, pedidos(id_venda), lojas(nome)")
    .order("criado_em", { ascending: false })
    .limit(300);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    return <ErrorState title="Falha ao carregar repasses" detail={error.message} />;
  }

  const repasses = data ?? [];
  // `processando` = claim feito, transferência PIX em voo ou presa por crash
  // entre o claim e a gravação do resultado (0151). Preso: conferir na Asaas
  // pelo id da linha e resolver manual (reprocessar via SQL ou marcar).
  const filtros = ["pendente", "processando", "transferido", "falhou", "inelegivel", "estornado"];

  return (
    <div>
      <PageHeader title="Repasses" subtitle="Ledger de repasses por pedido" count={repasses.length} />

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <a href="/admin/repasses" className={!status ? "font-semibold text-aco-600" : "text-ink-2"}>
          Todos
        </a>
        {filtros.map((f) => (
          <a
            key={f}
            href={`/admin/repasses?status=${f}`}
            className={status === f ? "font-semibold text-aco-600" : "text-ink-2"}
          >
            {rotuloStatus[f]}
          </a>
        ))}
      </div>

      {repasses.length === 0 ? (
        <EmptyState>Nenhum repasse registrado.</EmptyState>
      ) : (
        <Table headers={["Pedido", "Loja", "Destino", "Valor", "Status", "Criado em"]}>
          {repasses.map((r) => (
            <tr key={r.id} className="text-ink dark:text-ink-2">
              <td className="px-4 py-3 font-mono text-xs">{r.pedidos?.id_venda ?? "—"}</td>
              <td className="px-4 py-3">{r.lojas?.nome ?? "—"}</td>
              <td className="px-4 py-3 capitalize">{r.destino}</td>
              <td className="px-4 py-3 text-right num font-semibold">{fmtBRL(r.valor)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={rotuloStatus[r.status] ?? r.status} />
              </td>
              <td className="px-4 py-3">{fmtDate(r.criado_em)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
