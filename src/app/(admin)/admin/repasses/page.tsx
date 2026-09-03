import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, KpiCard, Table, StatusBadge, EmptyState, fmtBRL, fmtDate } from "@/components/admin/ui";
import { PeriodoTabs } from "@/components/painel/PeriodoTabs";
import {
  parseRange,
  resolverJanela,
  RANGE_LABEL,
  REPASSE_STATUS,
  REPASSE_STATUS_LABEL,
  resumoRepassesPorStatus,
  type RepasseStatus,
} from "@/lib/dashboard-kpis";

export const dynamic = "force-dynamic";

// Ledger de repasses (migration 0084): visão por status + valor por período.
// `status=transferido` + `range` = "repasses realizados no período" (o card
// do dashboard aponta para cá). Populado sob demanda pelo repasse automático
// (0111/0129) e pelo estorno/curadoria — não há transferência PIX aqui.
export default async function RepassesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; range?: string }>;
}) {
  if (!isSupabaseConfigured) {
    return (
      <ErrorState
        title="Supabase não configurado"
        detail="Defina as variáveis do Supabase em web/.env.local."
      />
    );
  }

  const params = await searchParams;
  const temRange = params.range != null;
  const range = parseRange(params.range);
  const janela = resolverJanela(range);
  const statusFiltro = REPASSE_STATUS.includes(params.status as RepasseStatus)
    ? (params.status as RepasseStatus)
    : undefined;

  const supabase = await createClient();

  // Resumo por status: sempre sobre a janela (ou tudo, sem range), ignorando o
  // filtro de status — os cards mostram todos os status lado a lado.
  let resumoQuery = supabase.from("repasses").select("status, valor");
  if (temRange) {
    resumoQuery = resumoQuery
      .gte("criado_em", janela.desde)
      .lt("criado_em", janela.ate);
  }
  const { data: resumoData, error: resumoErr } = await resumoQuery.limit(5000);
  if (resumoErr) {
    return <ErrorState title="Falha ao carregar repasses" detail={resumoErr.message} />;
  }
  const resumo = resumoRepassesPorStatus(resumoData ?? []);

  // Lista detalhada, aplicando o filtro de status quando houver.
  let query = supabase
    .from("repasses")
    .select(
      "id, pedido_id, destino, loja_id, afiliado_id, valor, status, criado_em, transferido_em, pedidos(id_venda), lojas(nome)",
    )
    .order("criado_em", { ascending: false })
    .limit(500);
  if (temRange) query = query.gte("criado_em", janela.desde).lt("criado_em", janela.ate);
  if (statusFiltro) query = query.eq("status", statusFiltro);

  const { data, error } = await query;
  if (error) {
    return <ErrorState title="Falha ao carregar repasses" detail={error.message} />;
  }
  const repasses = data ?? [];

  const hrefStatus = (s?: string) => {
    const q = new URLSearchParams();
    if (temRange) q.set("range", range);
    if (s) q.set("status", s);
    const qs = q.toString();
    return qs ? `/admin/repasses?${qs}` : "/admin/repasses";
  };

  return (
    <div>
      <PageHeader
        title="Repasses"
        subtitle={
          temRange
            ? `Ledger de repasses · ${RANGE_LABEL[range]}`
            : "Ledger de repasses por pedido"
        }
        count={repasses.length}
      />

      {temRange && <PeriodoTabs atual={range} basePath="/admin/repasses" />}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {REPASSE_STATUS.map((s) => (
          <KpiCard
            key={s}
            label={REPASSE_STATUS_LABEL[s]}
            value={fmtBRL(resumo[s].total)}
            hint={`${resumo[s].n} repasse${resumo[s].n === 1 ? "" : "s"}`}
            accent={s === "falhou" || s === "estornado" ? "warning" : "default"}
          />
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        <a
          href={hrefStatus(undefined)}
          className={!statusFiltro ? "font-semibold text-aco-600" : "text-ink-2 hover:text-aco-600"}
        >
          Todos
        </a>
        {REPASSE_STATUS.map((s) => (
          <a
            key={s}
            href={hrefStatus(s)}
            className={statusFiltro === s ? "font-semibold text-aco-600" : "text-ink-2 hover:text-aco-600"}
          >
            {REPASSE_STATUS_LABEL[s]}
          </a>
        ))}
      </div>

      {repasses.length === 0 ? (
        <EmptyState>Nenhum repasse para este filtro.</EmptyState>
      ) : (
        <Table headers={["Pedido", "Loja", "Destino", "Valor", "Status", "Criado em", "Transferido em"]}>
          {repasses.map((r) => (
            <tr key={r.id} className="text-ink dark:text-ink-2">
              <td className="px-4 py-3 font-mono text-xs">{r.pedidos?.id_venda ?? "—"}</td>
              <td className="px-4 py-3">{r.lojas?.nome ?? "—"}</td>
              <td className="px-4 py-3 capitalize">{r.destino}</td>
              <td className="px-4 py-3 text-right num font-semibold">{fmtBRL(r.valor)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={REPASSE_STATUS_LABEL[r.status as RepasseStatus] ?? r.status} />
              </td>
              <td className="px-4 py-3">{fmtDate(r.criado_em)}</td>
              <td className="px-4 py-3">{r.transferido_em ? fmtDate(r.transferido_em) : "—"}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
