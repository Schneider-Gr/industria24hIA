import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ErrorState } from "@/components/ErrorState";
import { PageHeader, Table, StatusBadge, EmptyState, fmtBRL, fmtDate } from "@/components/admin/ui";
import { fetchAll, chunk } from "@/lib/supabase/fetch-all";
import { AcoesPedido } from "@/components/admin/AcoesPedido";
import { PeriodoTabs } from "@/components/painel/PeriodoTabs";
import { parseRange, resolverJanela, RANGE_LABEL } from "@/lib/dashboard-kpis";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Filtro de status vindo dos cards do dashboard (drill-down) — só os valores
// reais de `pedidos.status_pedido`.
const STATUS_FILTROS = [
  "Aguardando Pagamento",
  "Pagamento Realizado",
  "Enviado",
  "Cancelado",
] as const;

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; status?: string }>;
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
  const statusFiltro = STATUS_FILTROS.includes(
    params.status as (typeof STATUS_FILTROS)[number],
  )
    ? params.status
    : undefined;

  const supabase = await createClient();
  // Leitura cross-seller garantida pela policy is_admin (migration 0004).
  let query = supabase
    .from("pedidos")
    .select("id, id_venda, cliente_nome, data, status_pedido, valor_pedido, disputa_aberta_em")
    .order("data", { ascending: false })
    .limit(500);
  if (temRange) query = query.gte("data", janela.desde).lt("data", janela.ate);
  if (statusFiltro) query = query.eq("status_pedido", statusFiltro);

  const { data, error } = await query;

  if (error) {
    return <ErrorState title="Falha ao carregar pedidos" detail={error.message} />;
  }

  const pedidos = data ?? [];
  const ids = pedidos.map((p) => p.id);
  const itensChunks = await Promise.all(
    chunk(ids).map((grupo) =>
      fetchAll((from, to) =>
        supabase
          .from("linha_itens")
          .select("pedido_id, quantidade, repasse_ind")
          .in("pedido_id", grupo)
          .range(from, to),
      ),
    ),
  );

  const agg = new Map<string, { itens: number; repasse: number }>();
  for (const it of itensChunks.flatMap((r) => r.data)) {
    const cur = agg.get(it.pedido_id) ?? { itens: 0, repasse: 0 };
    cur.itens += it.quantidade ?? 0;
    cur.repasse += it.repasse_ind ?? 0;
    agg.set(it.pedido_id, cur);
  }

  const totalValor = pedidos.reduce((s, p) => s + (p.valor_pedido ?? 0), 0);
  const subtitle = [
    temRange ? `Período: ${RANGE_LABEL[range]}` : "Todos os pedidos",
    statusFiltro ? `Status: ${statusFiltro}` : null,
    `Soma ${fmtBRL(totalValor)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const hrefStatus = (s?: string) => {
    const q = new URLSearchParams();
    if (temRange) q.set("range", range);
    if (s) q.set("status", s);
    const qs = q.toString();
    return qs ? `/admin/pedidos?${qs}` : "/admin/pedidos";
  };

  return (
    <div>
      <PageHeader title="Pedidos" subtitle={subtitle} count={pedidos.length} />

      {temRange && <PeriodoTabs atual={range} basePath="/admin/pedidos" />}

      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <Link
          href={hrefStatus(undefined)}
          className={!statusFiltro ? "font-semibold text-aco-600" : "text-ink-2 hover:text-aco-600"}
        >
          Todos
        </Link>
        {STATUS_FILTROS.map((s) => (
          <Link
            key={s}
            href={hrefStatus(s)}
            className={statusFiltro === s ? "font-semibold text-aco-600" : "text-ink-2 hover:text-aco-600"}
          >
            {s}
          </Link>
        ))}
        <span className="text-line">|</span>
        <Link href="/admin/pedidos/exportar" className="text-aco-600 hover:underline">
          ↓ Exportar CSV (todos)
        </Link>
      </div>

      {pedidos.length === 0 ? (
        <EmptyState>Nenhum pedido para este filtro.</EmptyState>
      ) : (
        <Table
          headers={["ID", "Comprador", "Data", "Total itens", "Valor", "Repasse Ind", "Status", "Ações"]}
        >
          {pedidos.map((p) => {
            const a = agg.get(p.id) ?? { itens: 0, repasse: 0 };
            const podeAgir = p.status_pedido !== "Cancelado";
            return (
              <tr key={p.id} className="text-ink dark:text-ink-2">
                <td className="px-4 py-3 font-mono text-xs">{p.id_venda}</td>
                <td className="px-4 py-3">{p.cliente_nome ?? "—"}</td>
                <td className="px-4 py-3">{fmtDate(p.data)}</td>
                <td className="px-4 py-3 text-right num">{a.itens}</td>
                <td className="px-4 py-3 text-right num font-semibold">{fmtBRL(p.valor_pedido)}</td>
                <td className="px-4 py-3 text-right num text-muted">{fmtBRL(a.repasse)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status_pedido} />
                  {p.disputa_aberta_em && (
                    <span className="ml-2 rounded bg-erro/10 px-1.5 py-0.5 text-xs font-semibold text-erro">
                      Disputa
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {podeAgir ? (
                    <AcoesPedido pedidoId={p.id} disputaAberta={Boolean(p.disputa_aberta_em)} />
                  ) : (
                    <span className="text-xs text-ink-2">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
